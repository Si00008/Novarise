// ========== 【分区 4 / 5】原有脚本块①（未重排、未改逻辑） ==========
// 内容：右侧游戏折叠菜单（分区 4）+ 早期占位版 AI 聊天窗（分区 5，真实 AI 在下方主逻辑里）
/* ========== 【新增】游戏折叠菜单 + AI 聊天悬浮窗：仅服务本次新增控件，不触碰 app.js 既有逻辑 ========== */
(function () {
  'use strict';

  /* ---------- 1. 右侧游戏面板：分类折叠 / 游戏选中 ---------- */
  var rp = document.getElementById('rightPanel');
  if (rp) {
    // 一级分类折叠（展开/收起二级游戏项）
    var heads = rp.querySelectorAll('.rp-group-head');
    Array.prototype.forEach.call(heads, function (head) {
      head.addEventListener('click', function () {
        var body = head.nextElementSibling;
        if (!body) return;
        var isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        head.textContent = (isOpen ? '▸ ' : '▾ ') + (head.getAttribute('data-label') || '');
      });
    });

    // 选中游戏 → 显示顶部多游戏数据面板
    var gd = document.getElementById('gameDashboard');
    var gameNames = { maimai: '舞萌', dancecube: '舞立方', lol: 'LOL', hok: '王者荣耀', valorant: '瓦罗兰特' };
    var games = rp.querySelectorAll('.rp-game');
    Array.prototype.forEach.call(games, function (item) {
      item.addEventListener('click', function () {
        Array.prototype.forEach.call(games, function (x) {
          x.style.background = 'transparent';
          x.style.fontWeight = '400';
        });
        item.style.background = 'rgba(108,180,238,0.16)';
        item.style.fontWeight = '600';

        var g = item.getAttribute('data-game');
        var name = gameNames[g] || g;
        if (gd) {
          gd.style.display = 'grid';
          gd.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
          gd.style.gap = '16px';
        }
        var tag = document.getElementById('gdPlayerTag');
        if (tag) tag.textContent = '游戏：' + name;
        var title = document.getElementById('gdGameName');
        if (title) title.textContent = name + ' · 玩家信息';
      });
    });

    // 整窗收起 / 展开
    var collapseBtn = document.getElementById('rpCollapseBtn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        var groups = rp.querySelectorAll('.rp-group');
        var collapsed = collapseBtn.getAttribute('data-collapsed') === '1';
        Array.prototype.forEach.call(groups, function (g) { g.style.display = collapsed ? '' : 'none'; });
        collapseBtn.setAttribute('data-collapsed', collapsed ? '0' : '1');
        collapseBtn.textContent = collapsed ? '—' : '＋';
      });
    }
  }

  /* ---------- 2. AI 聊天悬浮窗 ---------- */
  var chatBtn = document.getElementById('aiChatBtn');
  var chatPanel = document.getElementById('aiChatPanel');
  var closeChatBtn = document.getElementById('closeAiChat');
  var chatMessages = document.getElementById('aiChatMessages');
  var chatInput = document.getElementById('aiChatInput');
  var chatSend = document.getElementById('aiChatSend');

  function openChat() {
    if (!chatPanel) return;
    chatPanel.style.display = 'flex';
    if (chatInput) setTimeout(function () { chatInput.focus(); }, 50);
  }
  function closeChat() {
    if (chatPanel) chatPanel.style.display = 'none';
  }

  function appendMessage(text, who) {
    if (!chatMessages) return;
    var isUser = who === 'user';
    var row = document.createElement('div');
    row.className = isUser ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-ai';   // 【新增】挂类名，样式由 style.css 的 .ai-msg 系列接管
    row.style.cssText = 'max-width:86%;padding:8px 11px;border-radius:12px;font-size:13px;line-height:1.55;word-break:break-word;white-space:pre-wrap;align-self:' + (isUser ? 'flex-end' : 'flex-start') + ';background:' + (isUser ? 'rgba(108,180,238,0.20)' : 'var(--bg,#f1f3f6)') + ';color:var(--text,#222);';
    row.textContent = text;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendMessage() {
    var value = chatInput && chatInput.value ? chatInput.value.trim() : '';
    if (!value) return;
    appendMessage(value, 'user');
    chatInput.value = '';
    // 本地占位回复：接入后端 AI 接口后，把这里替换为真实请求即可
    setTimeout(function () {
      appendMessage('（AI 服务尚未接入，接入后端接口后此处会返回真实回答）', 'ai');
    }, 300);
  }

  if (chatBtn) chatBtn.addEventListener('click', function () {
    if (!chatPanel) return;
    if (chatPanel.style.display === 'flex') closeChat(); else openChat();
  });
  if (closeChatBtn) closeChatBtn.addEventListener('click', closeChat);
  if (chatSend) chatSend.addEventListener('click', sendMessage);
  if (chatInput) chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
})();

// ========== 【分区 5】原有脚本块②（未重排、未改逻辑） ==========
// 内容：AI 模型选择器 + 各平台 API Key 设置，属「原有业务模块」
/* ========== 【新增】AI 模型选择器 + API Key 设置：只绑定本次新增控件，不改动上面既有逻辑 ========== */
(function () {
  'use strict';

  var LS_MODEL = 'novarise_ai_model';      // 上次选中的模型 ID
  var LS_APIKEY = 'novarise_ai_api_key';   // 用户粘贴的聚合平台 API Key

  var sel    = document.getElementById('aiModelSelect');
  var dot    = document.getElementById('aiKeyDot');
  var sBtn   = document.getElementById('aiSettingsBtn');
  var sPanel = document.getElementById('aiSettingsPanel');
  var sClose = document.getElementById('aiSettingsClose');
  var inp    = document.getElementById('aiApiKeyInput');
  var hint   = document.getElementById('aiKeyHint');
  var btnSave  = document.getElementById('aiKeySave');
  var btnClear = document.getElementById('aiKeyClear');

  /* localStorage 可能被浏览器隐私策略禁用，统一包一层，失败时静默降级为“不记忆” */
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) { localStorage.setItem(k, v); } else { localStorage.removeItem(k); } } catch (e) {} }

  /* Key 打码显示，避免明文暴露在标题和提示里 */
  function maskKey(k) { return k.length <= 10 ? '****' : (k.slice(0, 6) + '…' + k.slice(-4)); }

  /* 同步配置状态：绿点=已存 Key；同时更新悬浮提示与提示文案 */
  function refreshKeyState() {
    var k = lsGet(LS_APIKEY);
    if (dot) {
      dot.style.background = k ? '#6BCB77' : '#ccc';
      dot.style.boxShadow = k ? '0 0 0 3px rgba(107,203,119,0.18)' : 'none';
      dot.title = k ? ('已配置 API Key：' + maskKey(k)) : '未配置 API Key';
    }
    if (hint) { hint.textContent = k ? ('当前 Key：' + maskKey(k) + '（仅存本机）') : '尚未配置'; }
  }

  /* 恢复上次选择的模型；若该 option 已被用户删掉，则保持默认第一项 */
  var savedModel = lsGet(LS_MODEL);
  if (sel && savedModel) {
    var hit = false;
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value === savedModel) { hit = true; } });
    if (hit) { sel.value = savedModel; }
  }
  if (sel) {
    sel.addEventListener('change', function () { lsSet(LS_MODEL, sel.value); });
  }

  function openSettings() {
    if (!sPanel) return;
    if (inp) { inp.value = lsGet(LS_APIKEY); }   // 回填已保存的 Key，方便直接改
    refreshKeyState();
    sPanel.style.display = 'flex';
    if (inp) { setTimeout(function () { inp.focus(); }, 60); }
  }
  function closeSettings() { if (sPanel) { sPanel.style.display = 'none'; } }

  /* 齿轮：再点一次收起 */
  if (sBtn) {
    sBtn.addEventListener('click', function () {
      if (sPanel && sPanel.style.display === 'flex') { closeSettings(); } else { openSettings(); }
    });
  }
  if (sClose) { sClose.addEventListener('click', closeSettings); }

  /* 点遮罩空白处关闭 */
  if (sPanel) {
    sPanel.addEventListener('click', function (e) { if (e.target === sPanel) { closeSettings(); } });
  }
  /* Esc 关闭（只在本浮层打开时响应） */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sPanel && sPanel.style.display === 'flex') { closeSettings(); }
  });

  if (btnSave) {
    btnSave.addEventListener('click', function () {
      var v = inp ? inp.value.trim() : '';
      lsSet(LS_APIKEY, v);
      refreshKeyState();
      closeSettings();
    });
  }
  if (btnClear) {
    btnClear.addEventListener('click', function () {
      lsSet(LS_APIKEY, '');
      if (inp) { inp.value = ''; }
      refreshKeyState();
    });
  }

  /* 供后续接入真实请求时读取：app.js 里可调用 window.getAiModelConfig() */
  window.getAiModelConfig = function () {
    return {
      model: sel ? sel.value : '',
      apiKey: lsGet(LS_APIKEY),
      hasKey: !!lsGet(LS_APIKEY)
    };
  };

  refreshKeyState();
})();

/*============================================================
     【分区 3｜新增】Token 绑定模块
     职责：水鱼 Import-Token 的保存 / 解绑 / 状态渲染。
     存储 key：novarise_df_token
     说明：后端 FastAPI 完全无状态，Token 只在本机浏览器与请求头里存在。
     跨模块协作：绑定成功后调用 window.__nvRefreshMaimai()（若正停在舞萌面板则立即刷新），
                 解绑后调用 window.__nvClearMaimai()（清空已加载的舞萌数据并显示占位）。
     这两个钩子由下方「分区 4」定义，用户点击时早已就绪。
     ============================================================ */

(function () {
  'use strict';

  var DF_TOKEN_KEY = 'novarise_df_token';

  /* ---------- 读写 ---------- */
  function getDfToken() {
    try { return (localStorage.getItem(DF_TOKEN_KEY) || '').trim(); } catch (e) { return ''; }
  }
  function setDfToken(value) {
    try { localStorage.setItem(DF_TOKEN_KEY, value); return true; } catch (e) { return false; }
  }
  function clearDfToken() {
    try { localStorage.removeItem(DF_TOKEN_KEY); } catch (e) { /* 隐私模式可能抛错，忽略 */ }
  }

  /* ---------- 状态渲染：有 Token → 显示已绑态；无 → 显示输入框 ---------- */
  function renderDfTokenUI() {
    var unbound = document.getElementById('dfTokenUnbound');
    var bound = document.getElementById('dfTokenBound');
    var input = document.getElementById('dfTokenInput');
    var isBound = !!getDfToken();

    if (unbound) unbound.classList.toggle('df-token-hidden', isBound);
    if (bound) bound.classList.toggle('df-token-hidden', !isBound);
    // 已绑定后不在页面里留明文
    if (isBound && input) input.value = '';
  }

  /* ---------- 提示：优先复用页面原有 showToast ---------- */
  function dfToast(msg) {
    if (typeof showToast === 'function') { showToast(msg); return; }

    // 兜底：极简顶部悬浮 Toast（深色半透明、白字、3 秒消失、无外部依赖）
    var t = document.getElementById('dfFallbackToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dfFallbackToast';
      t.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);'
        + 'background:rgba(0,0,0,0.78);color:#fff;font-size:13px;padding:10px 20px;'
        + 'border-radius:20px;z-index:3000;white-space:nowrap;max-width:90vw;'
        + 'overflow:hidden;text-overflow:ellipsis;display:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.display = 'none'; }, 3000);
  }

  /* ---------- 保存绑定 ---------- */
  function bindToken() {
    var input = document.getElementById('dfTokenInput');
    var value = input && input.value ? input.value.trim() : '';

    if (!value) { dfToast('Token不能为空'); return; }
    if (!setDfToken(value)) { dfToast('本地存储不可用，请关闭隐私模式后重试'); return; }

    if (input) input.value = '';
    renderDfTokenUI();
    dfToast('绑定成功');

    // 自动触发一次舞萌成绩刷新（仅在当前正停留在舞萌面板时生效）
    if (typeof window.__nvRefreshMaimai === 'function') window.__nvRefreshMaimai();
  }

  /* ---------- 解绑 ---------- */
  function unbindToken() {
    clearDfToken();
    renderDfTokenUI();
    dfToast('已解绑');

    // 清空面板里已加载的舞萌数据，改显示占位提示
    if (typeof window.__nvClearMaimai === 'function') window.__nvClearMaimai();
  }

  /* ---------- 入口 ---------- */
  function initDfToken() {
    var bindBtn = document.getElementById('bindTokenBtn');
    var unbindBtn = document.getElementById('unbindTokenBtn');
    var input = document.getElementById('dfTokenInput');

    if (bindBtn) bindBtn.addEventListener('click', bindToken);
    if (unbindBtn) unbindBtn.addEventListener('click', unbindToken);
    if (input) input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); bindToken(); }
    });

    renderDfTokenUI();   // 页面初始化时按 localStorage 渲染绑定状态
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDfToken);
  } else {
    initDfToken();       // 本脚本在 body 末尾，此时 DOM 已就绪
  }
})();

// ============================================================
// 【分区导航｜JS】本次只做结构与新增，未重排任何原有代码（避免 IIFE 执行时机
// 与 const 声明时序被破坏）。各分区实际位置如下：
//   分区 1 全局工具函数   → 搜 "// ---------- 工具 ----------"
//   分区 2 全局状态与常量 → 搜 STORAGE_KEY / DATA_VERSION / API_BASE / mockGameData
//   分区 3 Token 绑定模块 → 上方独立的脚本块（新增）
//   分区 4 游戏面板业务   → 搜 "// 亮点标签的三种配色"
//   分区 5 原有业务模块   → 待办 / 习惯 / 心情 / 打卡 / 便签 / 旅程 / AI
//   分区 6 页面初始化入口 → 搜 "【分区 6】"
// ============================================================
/* ============================================
   冉星 Novarise v4 - 主逻辑
   localStorage 键名: Novarise_data
   本次升级：
   1) 头像支持 emoji / 本地图片(Base64) / 网络URL
   2) 坚持历程改为"时间机器"：选日期可查看并编辑当天详情
   3) 【修改点】习惯与每日打卡合并为一个卡片，新增"新建习惯"弹窗
   4) 【修改点】卡片折叠时标题右侧显示概览数据（待办/习惯/心情）
   5) 【修改点】心情日历显示待办/打卡/心情事件小圆点，点击日期弹出当日详情弹窗
   ============================================ */
// ========== 【分区 2】全局状态与常量 ==========
const STORAGE_KEY = 'Novarise_data';
// 【本轮】数据版本号：旧数据读进来后由 migrateData 统一补齐字段并升到最新版本
const DATA_VERSION = '2.4';
const TODO_TYPES = ['工作', '生活', '学习', '其他'];

// ========== 【分区 1】全局工具函数（Toast / 存储 / 日期 / 转义等公共方法） ==========
// ---------- 工具 ----------
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function parseDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}
function dateToStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function formatDateCN(str) {
  const d = parseDate(str);
  return (d.getMonth()+1) + '月' + d.getDate() + '日';
}
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate()-1);
  return dateToStr(d);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2000);
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return r ? { r:parseInt(r[1],16), g:parseInt(r[2],16), b:parseInt(r[3],16) } : {r:108,g:180,b:238};
}
function debounce(fn, delay) {
  let timer = null;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); };
}
// 【修改点】安全绑定：以下元素来自升级版 index.html，缺失时跳过绑定，避免脚本报错
function safeBind(id, event, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, fn);
}

// 判断 avatar 是 emoji 还是图片（Base64 data:image/... 或 http(s) URL）
function isImageAvatar(avatar) {
  if (!avatar) return false;
  return avatar.startsWith('data:image/') || avatar.startsWith('http://') || avatar.startsWith('https://');
}

// ---------- 默认数据 ----------
function defaultData() {
  return {
    version: DATA_VERSION,      // 【本轮】数据结构版本号，写入时随数据一起存进 localStorage
    nickname: '小伙伴',
    avatar: '😊',           // 可以是 emoji 字符串，也可以是 data:image/... 或 URL
    themeColor: '#6CB4EE', darkMode: false,
    modules: { todo:true, habit:true, mood:true, checkin:true, quote:true, note:true, journey:true },
    todoViewMode: 'date',
    todoSearch: '',
    todos: [],
    checkins: [
      { id:'c1', name:'喝水', emoji:'💧', target:8, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c2', name:'运动', emoji:'🏃', target:1, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c3', name:'阅读', emoji:'📚', target:1, count:0, countDate:'', streak:0, lastDate:'' },
      { id:'c4', name:'早睡', emoji:'😴', target:1, count:0, countDate:'', streak:0, lastDate:'' },
    ],
    checkinViewMode: 'list',
    mood: {},
    quote: { currentIdx: 0, favorites: [] },
    note: '',
  };
}

const QUOTES = [
  '今天也要好好吃饭，好好睡觉。','慢慢来，比较快。','你已经做得很好了。',
  '生活明朗，万物可爱。','保持热爱，奔赴山海。','今日事，今日毕。',
  '健康是1，其他都是0。','阅读是一座随身携带的避难所。','运动是治愈一切的良药。',
  '早睡早起，赛过人参补身体。','别着急，你想要的岁月都会给你。','今天的努力，是明天的实力。',
  '温柔半两，从容一生。','愿你眼里有光，心中有梦。','每一天都是新的开始。',
  '好好爱自己，是终身浪漫的开始。','做一个温暖的人，像星星一样。','把日子过成诗，把生活过成画。',
  '心若向阳，无畏悲伤。','你笑起来真好看，像春天的花一样。',
];

// ---------- 数据兼容迁移 ----------
function migrateData(raw) {
  const d = defaultData();
  if (!raw || typeof raw !== 'object') return d;
  const m = { ...d, ...raw };
  // 【本轮】记下旧版本号：老数据这里是没有 version 字段的，方便排查迁移来源
  const fromVersion = (typeof raw.version === 'string' && raw.version) ? raw.version : '0.0';

  // todos
  if (Array.isArray(m.todos)) {
    m.todos = m.todos.map(t => ({
      id: t.id !== undefined ? t.id : 't' + Date.now() + Math.random(),
      text: t.text || '',
      done: !!t.done,
      date: (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) ? t.date : todayStr(),
      type: (t.type && TODO_TYPES.includes(t.type)) ? t.type : '其他',
    }));
  } else m.todos = [];

  // checkins
  let checkins = [];
  if (Array.isArray(m.checkins)) {
    checkins = m.checkins.map(c => ({
      id: c.id || 'c' + Date.now() + Math.random(),
      name: c.name || '习惯', emoji: c.emoji || '⭐',
      target: typeof c.target === 'number' && c.target > 0 ? c.target : 1,
      count: typeof c.count === 'number' ? c.count : 0,
      countDate: c.countDate || '',
      streak: typeof c.streak === 'number' ? c.streak : 0,
      lastDate: c.lastDate || '',
      // 【修改点】保留新建习惯弹窗写入的分类与长期计划天数
      category: typeof c.category === 'string' && c.category ? c.category : '其他',
      planDays: typeof c.planDays === 'number' && c.planDays > 0 ? c.planDays : 0,
    }));
  }
  if (Array.isArray(m.habits)) {
    m.habits.forEach(h => {
      if (checkins.some(c => c.name === h.name)) return;
      checkins.push({
        id: h.id || 'c' + Date.now() + Math.random(),
        name: h.name || '习惯', emoji: h.emoji || '⭐',
        target: 1, count: 0, countDate: '',
        streak: typeof h.streak === 'number' ? h.streak : 0,
        lastDate: h.lastDate || '',
        category: '其他', planDays: 0,
      });
    });
  }
  if (m.water && Array.isArray(m.water.items)) {
    m.water.items.forEach(w => {
      if (checkins.some(c => c.name === w.name)) return;
      checkins.push({
        id: w.id || 'c' + Date.now() + Math.random(),
        name: w.name || '饮品', emoji: w.emoji || '🥤',
        target: typeof w.target === 'number' && w.target > 0 ? w.target : 8,
        count: typeof w.count === 'number' ? w.count : 0,
        countDate: m.water.date || '',
        streak: 0, lastDate: '',
        category: '其他', planDays: 0,
      });
    });
  }
  m.checkins = checkins;
  // 【本轮】防丢数据：老数据里 checkins 被写成 null / 空数组等异常值时，
  // 上面会得到一个空数组，卡片就成了空白。这里只在「三种来源字段全都没内容」时回落默认习惯。
  const hadCheckinSource =
    (Array.isArray(raw.checkins) && raw.checkins.length > 0) ||
    (Array.isArray(raw.habits) && raw.habits.length > 0) ||
    (raw.water && Array.isArray(raw.water.items) && raw.water.items.length > 0);
  if (checkins.length === 0 && !hadCheckinSource) {
    checkins = JSON.parse(JSON.stringify(d.checkins));   // 深拷贝默认习惯，避免和默认对象共享引用
  }
  m.checkins = checkins;
  m.checkinViewMode = m.checkinViewMode === 'stack' ? 'stack' : 'list';
  delete m.habits; delete m.water;

  if (!m.mood || typeof m.mood !== 'object') m.mood = {};

  if (!m.quote || typeof m.quote !== 'object') m.quote = { currentIdx: 0, favorites: [] };
  if (!Array.isArray(m.quote.favorites)) m.quote.favorites = [];
  if (typeof m.quote.currentIdx !== 'number') m.quote.currentIdx = 0;
  if (m.favoriteQuote && typeof m.favoriteQuote === 'string' && m.favoriteQuote) {
    if (!m.quote.favorites.some(f => f.text === m.favoriteQuote)) {
      m.quote.favorites.push({ text: m.favoriteQuote, date: todayStr() });
    }
    delete m.favoriteQuote;
  }
  if (typeof m.currentQuoteIdx === 'number' && !m.quote.currentIdx) {
    m.quote.currentIdx = m.currentQuoteIdx;
    delete m.currentQuoteIdx;
  }

  // avatar 兼容：旧数据一定是 emoji 字符串；如果是图片 URL/base64 也保留
  if (!m.avatar || typeof m.avatar !== 'string') m.avatar = '😊';

  m.modules = { ...d.modules, ...(raw.modules || {}) };

  // 【本轮】迁移收尾：无论旧数据缺多少字段，这里都会被 {...d, ...raw} 补齐，
  // 再统一盖成当前版本号，下次读取走的就是完整结构，不会因为缺字段丢数据
  m.version = DATA_VERSION;
  m.migratedFrom = fromVersion;      // 记录这次是从哪一版迁过来的
  return m;
}

// ---------- 数据读写 ----------
let data;
let calYear, calMonth, selectedMoodDate;
let journeyDate;  // 坚持历程当前查看的日期

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      data = migrateData(JSON.parse(raw));
      // 【本轮】老数据迁移完立刻回写一次：把补齐的字段和 version:'2.4' 落盘，
      // 下次打开就是完整结构；已经是 2.4 的不重复写，避免每次启动都动存储
      if (data.migratedFrom !== DATA_VERSION) saveData();
      return;
    }
  } catch(e) { console.warn('读取失败', e); }
  data = defaultData();
}
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch(e) { console.warn('保存失败', e); }
}

// 跨天清零 count
function normalizeCheckins() {
  const today = todayStr();
  data.checkins.forEach(c => {
    if (c.countDate !== today) {
      c.count = 0;
      c.countDate = today;
    }
  });
}

// ---------- 头像渲染（统一处理 emoji / 图片） ----------
function renderAvatar(el) {
  if (!el) return;
  const a = data.avatar || '😊';
  if (isImageAvatar(a)) {
    el.innerHTML = `<img src="${escapeHtml(a)}" alt="头像" onerror="this.parentElement.textContent='😊'">`;
  } else {
    el.textContent = a;
  }
}

// ---------- 顶部 ----------
function renderHeader() {
  const h = new Date().getHours();
  let g = '你好';
  if (h<6) g='夜深了'; else if (h<11) g='早上好'; else if (h<14) g='中午好';
  else if (h<18) g='下午好'; else g='晚上好';
  document.getElementById('greetingText').textContent = g + '，' + data.nickname;
  renderAvatar(document.getElementById('avatar'));
  const d = new Date(), w = ['日','一','二','三','四','五','六'];
  document.getElementById('dateText').textContent =
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${w[d.getDay()]}`;
}

// ---------- 主题 ----------
function applyTheme() {
  document.documentElement.style.setProperty('--primary', data.themeColor);
  const rgb = hexToRgb(data.themeColor);
  document.documentElement.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  if (data.darkMode) {
    document.documentElement.style.setProperty('--primary-light', `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
    document.documentElement.setAttribute('data-theme','dark');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    document.documentElement.style.setProperty('--primary-light', `rgba(${rgb.r},${rgb.g},${rgb.b},0.13)`);
    document.documentElement.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = '🌙';
  }
}

/* ============================================
   待办
   ============================================ */
function getVisibleTodos() {
  const q = (data.todoSearch || '').trim().toLowerCase();
  if (q) return data.todos.filter(t => t.text.toLowerCase().includes(q));

  const y = document.getElementById('filterYear').value.trim();
  const m = document.getElementById('filterMonth').value.trim();
  const d = document.getElementById('filterDay').value.trim();

  // 1) 如果什么都没填，默认显示今天及未来
  if (!y && !m && !d) {
    return data.todos.filter(t => t.date >= todayStr());
  }

  // 2) 模糊匹配逻辑
  return data.todos.filter(t => {
    const parts = t.date.split('-'); // [YYYY, MM, DD]
    if (y && parts[0] !== y) return false;
    if (m && parts[1] !== m.padStart(2, '0')) return false;
    if (d && parts[2] !== d.padStart(2, '0')) return false;
    return true;
  });
}
function renderTodos() {
  const c = document.getElementById('todoContainer');
  const list = getVisibleTodos();
  const searching = !!(data.todoSearch || '').trim();
  if (list.length === 0) {
    c.innerHTML = `<div class="empty-state"><span class="emoji">${searching?'🔍':'🎉'}</span>${searching?'没有找到匹配的待办':'今天还没有待办，享受轻松时光'}</div>`;
  } else if (searching) {
    c.innerHTML = list.map(t => `
      <div class="search-result-item">
        <div class="todo-checkbox ${t.done?'checked':''}" data-todo-id="${t.id}"></div>
        <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
        <span class="todo-date-tag">${t.date.slice(5)} · ${escapeHtml(t.type)}</span>
        <button class="todo-del" data-todo-del="${t.id}">✕</button>
      </div>`).join('');
  } else if (data.todoViewMode === 'date') {
    c.innerHTML = renderByDate(list);
  } else {
    c.innerHTML = renderByType(list);
  }
  const all = data.todos.filter(t => t.date >= todayStr());
  const total = all.length, done = all.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round(done/total*100);
  document.getElementById('todoProgress').style.width = pct + '%';
  document.getElementById('todoProgressText').textContent = `${done} / ${total}（${pct}%）`;
}
function renderByDate(todos) {
  const byDate = {};
  todos.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });
  return Object.keys(byDate).sort().map(date => {
    const list = byDate[date];
    const doneCount = list.filter(t => t.done).length;
    const isToday = date === todayStr();
    const label = isToday ? '今天' : formatDateCN(date);
    const byType = {};
    list.forEach(t => { if (!byType[t.type]) byType[t.type] = []; byType[t.type].push(t); });
    const subs = TODO_TYPES.filter(type => byType[type]).map(type =>
      `<div class="todo-subgroup"><div class="todo-subgroup-title"># ${type}</div>${byType[type].map(todoItemHtml).join('')}</div>`
    ).join('');
    return `<div class="todo-group" data-group="${date}">
      <div class="todo-group-header" data-toggle="${date}">
        <span class="todo-group-title">📅 ${label}${isToday?'':' <span style="font-weight:400;color:var(--text-secondary);font-size:11px">'+date+'</span>'}</span>
        <span class="todo-group-meta"><span class="todo-group-badge">${doneCount}/${list.length}</span><span data-toggle-icon="${date}">▸</span></span>
      </div>
      <div class="todo-group-body">${subs}</div>
    </div>`;
  }).join('');
}
function renderByType(todos) {
  const byType = {};
  todos.forEach(t => { if (!byType[t.type]) byType[t.type] = []; byType[t.type].push(t); });
  const icons = { '工作':'💼','生活':'🏠','学习':'📖','其他':'📌' };
  return TODO_TYPES.filter(type => byType[type]).map(type => {
    const list = byType[type];
    const doneCount = list.filter(t => t.done).length;
    const byDate = {};
    list.forEach(t => { if (!byDate[t.date]) byDate[t.date] = []; byDate[t.date].push(t); });
    const subs = Object.keys(byDate).sort().map(date => {
      const isToday = date === todayStr();
      return `<div class="todo-subgroup"><div class="todo-subgroup-title">🗓 ${isToday?'今天':formatDateCN(date)}</div>${byDate[date].map(todoItemHtml).join('')}</div>`;
    }).join('');
    return `<div class="todo-group" data-group="type_${type}">
      <div class="todo-group-header" data-toggle="type_${type}">
        <span class="todo-group-title">${icons[type]||'📌'} ${type}</span>
        <span class="todo-group-meta"><span class="todo-group-badge">${doneCount}/${list.length}</span><span data-toggle-icon="type_${type}">▸</span></span>
      </div>
      <div class="todo-group-body">${subs}</div>
    </div>`;
  }).join('');
}
function todoItemHtml(t) {
  return `<div class="todo-item">
    <div class="todo-checkbox ${t.done?'checked':''}" data-todo-id="${t.id}"></div>
    <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
    <button class="todo-del" data-todo-del="${t.id}">✕</button>
  </div>`;
}
function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;
  const dateInput = document.getElementById('todoDate');
  const date = (dateInput && dateInput.value) ? dateInput.value : todayStr();
  data.todos.push({ id:'t'+Date.now(), text, done:false, date, type:document.getElementById('todoTypeSelect').value });
  input.value = ''; input.blur();
  // 【新增】提交成功后把日期框重置回今日，避免下一条待办误带上次选的日期
  if (dateInput) dateInput.value = todayStr();
  // 【修改点】实时刷新：新增待办后同步刷新打卡卡片与日历圆点
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已添加');
}
const debouncedAddFromBlur = debounce(() => {
  const input = document.getElementById('todoInput');
  if (input.value.trim()) addTodo();
}, 400);
function handleTodoClick(e) {
  const ck = e.target.closest('[data-todo-id]');
  if (ck) {
    const t = data.todos.find(x => String(x.id) === String(ck.dataset.todoId));
    if (t) { t.done = !t.done; saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney(); }
    return;
  }
  const del = e.target.closest('[data-todo-del]');
  if (del) {
    data.todos = data.todos.filter(x => String(x.id) !== String(del.dataset.todoDel));
    // 【修改点】实时刷新：待办删除后同步日历圆点
    saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  }
}
function handleGroupToggle(e) {
  const hdr = e.target.closest('[data-toggle]');
  if (!hdr) return;
  const g = hdr.parentElement;
  g.classList.toggle('expanded');
  const icon = g.querySelector('[data-toggle-icon]');
  if (icon) icon.textContent = g.classList.contains('expanded') ? '▾' : '▸';
}
function clearDone() {
  const today = todayStr();
  data.todos = data.todos.filter(t => !(t.date === today && t.done));
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已清空今日已完成');
}

/* ============================================
   打卡（习惯已合并进每日打卡，统一渲染到 checkinContainer）
   ============================================ */
function checkStreakOnCount(item, oldCount, newCount) {
  const today = todayStr();
  const wasDone = oldCount >= item.target;
  const nowDone = newCount >= item.target;
  if (!wasDone && nowDone) {
    if (item.lastDate === today) return;
    item.streak = (item.lastDate === yesterdayStr()) ? item.streak + 1 : 1;
    item.lastDate = today;
  } else if (wasDone && !nowDone) {
    if (item.lastDate === today) {
      item.lastDate = '';
      if (item.streak <= 1) item.streak = 0;
    }
  }
}
// 【删除】renderHabits / tapHabit / addCheckin 已随"习惯打卡"卡片合并而移除
function deleteCheckin(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  if (confirm(`确定删除「${item.name}」吗？连续打卡记录将一并清除。`)) {
    data.checkins = data.checkins.filter(x => String(x.id) !== String(id));
    // 【修改点】实时刷新：删除后同步日历圆点
    saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
    showToast('已删除');
  }
}
function clearAllCheckins() {
  if (!confirm('确定清空所有打卡项吗？此操作不可恢复。')) return;
  data.checkins = [];
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('已清空所有打卡项');
}
function renderCheckins() {
  normalizeCheckins();
  const c = document.getElementById('checkinContainer');
  if (data.checkins.length === 0) {
    // 【修改点】文案更新：习惯与打卡已合并，引导使用"新建习惯"按钮
    c.innerHTML = '<div class="empty-state"><span class="emoji">✅</span>还没有习惯，点击下方「＋ 新建习惯」添加</div>';
    return;
  }
  c.innerHTML = data.checkinViewMode === 'stack' ? renderCheckinStack() : renderCheckinList();
}
function renderCheckinList() {
  return data.checkins.map(item => {
    const pct = Math.min(100, item.count/item.target*100);
    return `<div class="checkin-item">
      <div class="checkin-item-header">
        <span class="checkin-item-name">${item.emoji} ${escapeHtml(item.name)}</span>
        <span>
          <span class="checkin-item-count" data-target-edit="${item.id}" title="点击修改目标">${item.count} / ${item.target}</span>
          <button class="checkin-target-btn" data-target-edit="${item.id}" title="修改目标">改目标</button>
        </span>
      </div>
      <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
      <div class="checkin-controls">
        <button class="btn" data-checkin-add="${item.id}">+1</button>
        <button class="btn btn-ghost" data-checkin-minus="${item.id}">-1</button>
        <button class="checkin-remove" data-checkin-del="${item.id}" title="删除">✕</button>
      </div>
    </div>`;
  }).join('');
}
function renderCheckinStack() {
  const totalCount = data.checkins.reduce((s,i)=>s+i.count,0);
  const totalTarget = data.checkins.reduce((s,i)=>s+i.target,0);
  const pct = Math.min(100, totalCount/totalTarget*100);
  const tags = data.checkins.map(item => {
    const done = item.count >= item.target;
    return `<span class="checkin-tag ${done?'done':''}" data-tag-id="${item.id}">${item.emoji} ${escapeHtml(item.name)} ${item.count}/${item.target}</span>`;
  }).join('');
  return `<div class="water-summary">
      <div class="water-summary-count">${totalCount}</div>
      <div class="water-summary-target">今日目标 ${totalTarget} 次</div>
    </div>
    <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
    <div class="checkin-tags">${tags}</div>
    <div style="font-size:11px;color:var(--text-secondary);text-align:center;margin-top:6px">点击标签展开操作</div>`;
}
function checkinAdd(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  const old = item.count;
  item.count++; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【修改点】实时刷新：打卡变化同步更新日历圆点
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function checkinMinus(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item || item.count <= 0) return;
  const old = item.count;
  item.count--; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function editTarget(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  const input = prompt(`修改「${item.name}」的每日目标次数（当前 ${item.target}）：`, item.target);
  if (input === null) return;
  const n = parseInt(input, 10);
  if (isNaN(n) || n < 1 || n > 50) { showToast('请输入 1-50 的数字'); return; }
  item.target = n;
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  showToast('目标已修改');
}

/* ============================================
   新建习惯弹窗
   ============================================ */
// 【修改点】打开"新建习惯"弹窗并重置表单
function openHabitForm() {
  const mask = document.getElementById('habitFormMask');
  if (!mask) return;
  const name = document.getElementById('hfName');
  const target = document.getElementById('hfTarget');
  const planDays = document.getElementById('hfPlanDays');
  const category = document.getElementById('hfCategory');
  if (name) name.value = '';
  if (target) target.value = '';
  if (planDays) planDays.value = '';
  if (category) category.value = '健康';
  document.querySelectorAll('#habitIconPicker .habit-icon-option').forEach(el => el.classList.remove('active'));
  mask.style.display = 'flex';
  setTimeout(() => { if (name) name.focus(); }, 60);
}
// 【修改点】关闭"新建习惯"弹窗
function closeHabitForm() {
  const mask = document.getElementById('habitFormMask');
  if (mask) mask.style.display = 'none';
}
// 【修改点】提交新建习惯：读取表单数据 → push 到 data.checkins → 保存并实时刷新
function submitHabitForm() {
  const nameEl = document.getElementById('hfName');
  if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name) { showToast('请输入习惯名称'); nameEl.focus(); return; }

  const targetRaw = parseInt(document.getElementById('hfTarget').value, 10);
  const target = (!isNaN(targetRaw) && targetRaw >= 1) ? targetRaw : 1;

  const iconEl = document.querySelector('#habitIconPicker .habit-icon-option.active');
  const emoji = iconEl ? iconEl.dataset.e : '⭐';

  const category = document.getElementById('hfCategory').value || '其他';

  const planRaw = parseInt(document.getElementById('hfPlanDays').value, 10);
  const planDays = (!isNaN(planRaw) && planRaw >= 1) ? planRaw : 0;

  data.checkins.push({
    id: 'c' + Date.now(), name, emoji, target,
    count: 0, countDate: todayStr(), streak: 0, lastDate: '',
    category, planDays,
  });
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
  closeHabitForm();
  showToast('已添加习惯「' + name + '」');
}

/* ============================================
   心情月历
   ============================================ */
function renderMoodCalendar() {
  const today = new Date();
  if (calYear === undefined) {
    calYear = today.getFullYear(); calMonth = today.getMonth();
    selectedMoodDate = todayStr();
  }
  document.getElementById('calTitle').textContent = `${calYear}年${calMonth+1}月`;
  const grid = document.getElementById('calGrid');
  let html = ['日','一','二','三','四','五','六'].map(w => `<div class="cal-weekday">${w}</div>`).join('');
  const startWd = new Date(calYear, calMonth, 1).getDay();
  const dim = new Date(calYear, calMonth+1, 0).getDate();
  const dpm = new Date(calYear, calMonth, 0).getDate();
  for (let i = 0; i < 42; i++) {
    const dn = i - startWd + 1;
    let cy = calYear, cm = calMonth, cd = dn;
    if (dn < 1) { cm--; if (cm<0){cm=11;cy--;} cd = dpm + dn; }
    else if (dn > dim) { cm++; if (cm>11){cm=0;cy++;} cd = dn - dim; }
    const ds = `${cy}-${String(cm+1).padStart(2,'0')}-${String(cd).padStart(2,'0')}`;
    const mood = data.mood[ds];
    const isToday = ds === todayStr();
    const isSel = ds === selectedMoodDate;
    const other = (cy !== calYear || cm !== calMonth);

    // 【修改点】统计当天事件：待办 / 打卡 / 心情
    const todoCnt = data.todos.filter(t => t.date === ds).length;
    const checkinCnt = data.checkins.filter(c => c.countDate === ds && c.count > 0).length;
    const tips = [];
    if (todoCnt) tips.push(`待办 ${todoCnt}`);
    if (checkinCnt) tips.push(`打卡 ${checkinCnt}`);
    if (mood) tips.push(`心情 ${mood.emoji}`);
    const tipTitle = tips.length ? `${formatDateCN(ds)}：${tips.join(' · ')}` : '';
    // 【修改点】事件小圆点：多个时并排显示在日期数字下方
    const dots = [
      [todoCnt, 'dot-todo'],
      [checkinCnt, 'dot-checkin'],
      [mood, 'dot-mood'],
    ].filter(([cnt]) => cnt).map(([, cls]) =>
      `<span class="event-dot ${cls}" style="position:static;transform:none;"></span>`
    ).join('');
    const dotsWrap = dots
      ? `<span class="event-dots" style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);display:flex;gap:2px;line-height:0;">${dots}</span>`
      : '';

    html += `<div class="cal-day ${other?'other-month':''} ${isToday?'today':''} ${isSel?'selected':''} ${mood?'has-mood':''}" data-date="${ds}"${tipTitle?` title="${escapeHtml(tipTitle)}"`:''}>
      ${mood?`<span class="mood-emoji-small">${mood.emoji}</span>`:''}
      <span class="day-num">${cd}</span>
      ${dotsWrap}
    </div>`;
  }
  grid.innerHTML = html;
  renderMoodEditor();
  // 【修改点】renderMoodEditor 会重写心情标题，折叠概览数据需在此恢复
  updateCardOverviews();
}
function renderMoodEditor() {
  const m = data.mood[selectedMoodDate] || { emoji:'', note:'' };
  document.querySelectorAll('#moodEmojis .mood-emoji').forEach(el =>
    el.classList.toggle('selected', el.dataset.mood === m.emoji)
  );
  document.getElementById('moodNote').value = m.note || '';
  const isToday = selectedMoodDate === todayStr();
  const label = isToday ? '今天' : formatDateCN(selectedMoodDate);
  document.querySelector('#card-mood .card-title').innerHTML =
    `<span><span class="icon">💭</span>心情记录 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">（编辑：${label}）</span></span>`;
}
function selectMoodDate(ds) { selectedMoodDate = ds; renderMoodCalendar(); }
function selectMoodEmoji(emoji) {
  if (!data.mood[selectedMoodDate]) data.mood[selectedMoodDate] = { emoji, note:'' };
  else data.mood[selectedMoodDate].emoji = emoji;
  // 【修改点】实时刷新：心情变化同步更新日历圆点与打卡卡片
  saveData(); renderTodos(); renderMoodCalendar(); renderCheckins(); renderJourney();
}
function saveMoodNote() {
  const note = document.getElementById('moodNote').value.trim();
  if (!data.mood[selectedMoodDate]) {
    if (!note) return;
    data.mood[selectedMoodDate] = { emoji:'🙂', note };
  } else {
    data.mood[selectedMoodDate].note = note;
  }
  // 【修改点】实时刷新
  saveData(); renderTodos(); renderMoodCalendar(); renderCheckins(); renderJourney();
}

// 【修改点】点击日历日期：弹出该天的详情弹窗（待办/打卡/心情）
function openMoodDetail(ds) {
  const modal = document.getElementById('moodDetailModal');
  if (!modal) return;
  const isToday = ds === todayStr();
  document.getElementById('mdTitle').textContent = '心情详情 · ' + (isToday ? '今天' : formatDateCN(ds));

  const todos = data.todos.filter(t => t.date === ds);
  const dayCheckins = data.checkins.filter(c => c.countDate === ds && c.count > 0);
  const mood = data.mood[ds];
  const itemStyle = 'padding:4px 0;font-size:13px;';

  let html = '';
  // 待办
  html += `<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">📋 待办（${todos.length}）</div>`;
  html += todos.length
    ? todos.map(t => `<div style="${itemStyle}">${t.done ? '✅' : '⬜'} ${escapeHtml(t.text)}</div>`).join('')
    : `<div style="font-size:12px;color:var(--text-secondary)">无待办记录</div>`;
  html += `</div>`;
  // 打卡
  html += `<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:4px">✅ 打卡（${dayCheckins.length}）</div>`;
  html += dayCheckins.length
    ? dayCheckins.map(c => `<div style="${itemStyle}">${c.emoji} ${escapeHtml(c.name)}：${c.count}/${c.target}${c.count >= c.target ? ' ✅' : ''}</div>`).join('')
    : `<div style="font-size:12px;color:var(--text-secondary)">无打卡记录</div>`;
  html += `</div>`;
  // 心情
  html += `<div><div style="font-size:13px;font-weight:600;margin-bottom:4px">💭 心情</div>`;
  html += mood
    ? `<div style="font-size:18px">${mood.emoji || ''}${mood.note ? ' <span style="font-size:13px;color:var(--text-secondary)">' + escapeHtml(mood.note) + '</span>' : ''}</div>`
    : `<div style="font-size:12px;color:var(--text-secondary)">未记录心情</div>`;
  html += `</div>`;

  document.getElementById('mdContent').innerHTML = html;
  modal.style.display = 'flex';
}
// 【修改点】关闭心情详情弹窗
function closeMoodDetail() {
  const modal = document.getElementById('moodDetailModal');
  if (modal) modal.style.display = 'none';
}

/* ============================================
   每日一句
   ============================================ */
function renderQuote() {
  document.getElementById('quoteText').textContent = QUOTES[data.quote.currentIdx];
  const list = document.getElementById('favoritesList');
  const items = document.getElementById('favoritesItems');
  if (data.quote.favorites.length === 0) { list.style.display = 'none'; }
  else {
    list.style.display = 'block';
    items.innerHTML = data.quote.favorites.map((f, i) => `
      <div class="favorite-item">
        <span class="favorite-text">"${escapeHtml(f.text)}"</span>
        <span style="text-align:right">
          <div class="favorite-date">${escapeHtml(f.date)}</div>
          <button class="favorite-del" data-fav-del="${i}">✕</button>
        </span>
      </div>`).join('');
  }
}
function nextQuote() {
  data.quote.currentIdx = (data.quote.currentIdx + 1) % QUOTES.length;
  saveData(); renderQuote();
}
function favoriteCurrentQuote() {
  const text = QUOTES[data.quote.currentIdx];
  if (data.quote.favorites.some(f => f.text === text)) { showToast('已经收藏过了'); return; }
  data.quote.favorites.unshift({ text, date: todayStr() });
  saveData(); renderQuote(); showToast('已收藏');
}
function deleteFavorite(idx) {
  data.quote.favorites.splice(idx, 1);
  saveData(); renderQuote();
}

/* ============================================
   便签
   ============================================ */
function renderNote() { document.getElementById('noteArea').value = data.note; }
function saveNote() {
  data.note = document.getElementById('noteArea').value; saveData();
  document.getElementById('noteSaved').textContent =
    '✓ 已自动保存 ' + new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
}

/* ============================================
   坚持历程（时间机器）
   - 顶部日期选择器选择任意历史日期
   - 下方显示该日期的待办/打卡/心情详情，可直接编辑
   ============================================ */
function renderJourney() {
  if (!journeyDate) journeyDate = todayStr();
  const dateInput = document.getElementById('journeyDate');
  if (dateInput.value !== journeyDate) dateInput.value = journeyDate;

  const date = journeyDate;
  const isToday = date === todayStr();
  const label = isToday ? '今天' : formatDateCN(date);

  // --- 汇总标签 ---
  const todos = data.todos.filter(t => t.date === date);
  const td = todos.filter(t => t.done).length;
  // 打卡：当天 countDate === date 的项
  const dayCheckins = data.checkins.filter(c => c.countDate === date);
  const totalCups = dayCheckins.reduce((s,c) => s + c.count, 0);
  const doneCheckins = dayCheckins.filter(c => c.count >= c.target).length;
  const mood = data.mood[date];

  const summaryEl = document.getElementById('journeySummary');
  const stats = [];
  if (todos.length > 0) stats.push(`<span class="journey-stat ${td===todos.length?'highlight':''}">📋 待办 ${td}/${todos.length}</span>`);
  if (dayCheckins.length > 0) stats.push(`<span class="journey-stat">✅ 达标 ${doneCheckins}/${dayCheckins.length} 项</span>`);
  if (totalCups > 0) stats.push(`<span class="journey-stat">💧 累计 ${totalCups} 次</span>`);
  if (mood) stats.push(`<span class="journey-stat highlight">${mood.emoji}</span>`);
  summaryEl.innerHTML = stats.length > 0
    ? `<span style="font-size:12px;color:var(--text-secondary);margin-right:6px">${label}：</span>` + stats.join('')
    : `<span class="journey-detail-empty">${label} 还没有任何记录</span>`;

  // --- 详情编辑区 ---
  const detailEl = document.getElementById('journeyDetail');
  let html = '';

  // 1) 待办
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">📋 待办（${todos.length}）</div>`;
  if (todos.length === 0) {
    html += `<div class="journey-detail-empty">这一天没有待办</div>`;
  } else {
    html += todos.map(t => `
      <div class="journey-detail-item">
        <div class="todo-checkbox ${t.done?'checked':''}" data-journey-todo="${t.id}"></div>
        <span class="todo-text ${t.done?'done':''}">${escapeHtml(t.text)}</span>
        <span style="font-size:10px;color:var(--text-secondary)">${escapeHtml(t.type)}</span>
      </div>`).join('');
  }
  html += `</div>`;

  // 2) 打卡
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">✅ 打卡（${data.checkins.length}）</div>`;
  if (data.checkins.length === 0) {
    html += `<div class="journey-detail-empty">没有打卡项</div>`;
  } else {
    html += data.checkins.map(c => {
      // 历史日期的 count：如果 countDate === date 用真实值，否则显示 0
      const cnt = (c.countDate === date) ? c.count : 0;
      return `<div class="journey-detail-item">
        <span>${c.emoji}</span>
        <span style="flex:1">${escapeHtml(c.name)}</span>
        <span style="font-size:12px;color:var(--text-secondary)">${cnt}/${c.target}</span>
        <span class="checkin-mini-controls">
          <button class="btn btn-ghost" data-journey-check-minus="${c.id}" data-date="${date}">-</button>
          <button class="btn" data-journey-check-add="${c.id}" data-date="${date}">+</button>
        </span>
      </div>`;
    }).join('');
  }
  html += `</div>`;

  // 3) 心情
  const m = data.mood[date] || { emoji:'', note:'' };
  html += `<div class="journey-detail-section">
    <div class="journey-detail-title">💭 心情</div>
    <div class="journey-mood-editor">`;
  ['😄','🙂','😐','😔','😢'].forEach(e => {
    html += `<span class="mood-emoji ${m.emoji===e?'selected':''}" data-journey-mood="${e}" data-date="${date}">${e}</span>`;
  });
  html += `<textarea data-journey-mood-note="${date}" rows="2" placeholder="写点什么...">${escapeHtml(m.note||'')}</textarea>`;
  html += `</div></div>`;

  detailEl.innerHTML = html;
}

// 在"时间机器"里修改待办完成状态
function journeyToggleTodo(id) {
  const t = data.todos.find(x => String(x.id) === String(id));
  if (!t) return;
  t.done = !t.done;
  saveData();
  renderTodos();        // 同步主待办列表
  renderCheckins();     // 【修改点】实时刷新打卡卡片
  renderMoodCalendar(); // 【修改点】实时刷新日历圆点
  renderJourney();      // 同步历程自身
}

// 在"时间机器"里给某天的打卡项 +1/-1
// 注意：历史日期的 count 存在 checkin.count，但 countDate 记录是哪天
function journeyCheckAdd(id, date) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  // 如果当前 countDate 不是目标日期，先把 count 重置为该日期的值
  if (item.countDate !== date) {
    item.count = 0;
    item.countDate = date;
  }
  item.count++;
  // 如果达到目标且 lastDate 不是今天，更新 streak（仅限目标日期=今天时）
  if (date === todayStr()) {
    const oldCount = item.count - 1;
    checkStreakOnCount(item, oldCount, item.count);
  }
  saveData();
  // 【修改点】实时刷新：同步日历圆点
  renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function journeyCheckMinus(id, date) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  if (item.countDate !== date) {
    item.count = 0; item.countDate = date;
  }
  if (item.count <= 0) return;
  item.count--;
  if (date === todayStr()) {
    const oldCount = item.count + 1;
    checkStreakOnCount(item, oldCount, item.count);
  }
  saveData();
  // 【修改点】实时刷新
  renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}

// 在"时间机器"里选心情
function journeySelectMood(emoji, date) {
  if (!data.mood[date]) data.mood[date] = { emoji, note:'' };
  else data.mood[date].emoji = emoji;
  saveData();
  renderMoodCalendar();
  renderTodos(); // 【修改点】实时刷新待办
  renderCheckins(); // 【修改点】实时刷新打卡卡片
  renderJourney();
}
function journeySaveMoodNote(date, note) {
  if (!data.mood[date]) {
    if (!note.trim()) return;
    data.mood[date] = { emoji:'🙂', note };
  } else {
    data.mood[date].note = note;
  }
  saveData();
  renderMoodCalendar();
  renderTodos(); // 【修改点】实时刷新待办
  renderCheckins(); // 【修改点】实时刷新打卡卡片
  renderJourney();
}

/* ============================================
   模块显隐
   ============================================ */
function applyModuleVisibility() {
  // 【修改点】习惯卡已合并进"习惯与打卡"（card-checkin），map 中移除 habit；
  // card-checkin 只要 checkin 或 habit 任一开启即显示
  const map = { todo:'card-todo', mood:'card-mood', checkin:'card-checkin', quote:'card-quote', note:'card-note', journey:'card-journey' };
  Object.keys(map).forEach(k => {
    const el = document.getElementById(map[k]);
    if (el) el.style.display = data.modules[k] ? '' : 'none';
  });
  const checkinEl = document.getElementById('card-checkin');
  if (checkinEl) checkinEl.style.display = (data.modules.checkin || data.modules.habit) ? '' : 'none';
  document.querySelectorAll('.toggle[data-module]').forEach(el => el.classList.toggle('on', !!data.modules[el.dataset.module]));
}

/* ============================================
   折叠概览数据：折叠时在标题右侧显示数据摘要
   ============================================ */
// 【修改点】根据卡片类型计算概览文本
function getCardOverviewData(card) {
  if (card.id === 'card-todo') {
    const all = data.todos.filter(t => t.date >= todayStr());
    return `${all.filter(t => t.done).length}/${all.length}`;
  }
  if (card.id === 'card-checkin') {
    const done = data.checkins.filter(c => c.count >= c.target).length;
    return `${done}/${data.checkins.length}`;
  }
  if (card.id === 'card-mood') {
    const m = data.mood[todayStr()];
    return m ? m.emoji : '—';
  }
  return null;
}
// 【修改点】插入/更新/移除某张卡片的概览数据（展开时移除，折叠时插入）
function updateCardOverview(card) {
  const title = card.querySelector(':scope > .card-title');
  if (!title) return;
  const anchor = title.querySelector('.card-title-right') || title;
  let chip = anchor.querySelector('.overview-data');
  if (!card.classList.contains('collapsed')) {
    if (chip) chip.remove();
    return;
  }
  const text = getCardOverviewData(card);
  if (text == null) { if (chip) chip.remove(); return; }
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'overview-data';
    anchor.appendChild(chip);
  }
  chip.textContent = text;
}
// 【修改点】批量刷新所有卡片的概览数据
function updateCardOverviews() {
  document.querySelectorAll('.card').forEach(updateCardOverview);
}

/* ============================================
   全局卡片折叠：动态包裹 .card-title 之后的兄弟节点
   ============================================ */
const COLLAPSE_KEY = 'Novarise_card_state'; // localStorage 键：{ cardId: true/false }

function loadCardStates() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}; }
  catch(e) { return {}; }
}
function saveCardState(cardId, collapsed) {
  const s = loadCardStates();
  s[cardId] = collapsed;
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(s)); } catch(e) {}
}

function initCollapsibleCards() {
  const states = loadCardStates();
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, idx) => {
    // 给卡片一个唯一 id（没有就自动生成）
    const cardId = card.id || ('card-' + idx);
    if (!card.id) card.id = cardId;

    // 已经处理过就跳过
    if (card.dataset.collapseInit) return;

    // 兼容旧的 <details> 结构：把 summary 提到顶层，把 details-body 内容展开
    const oldDetails = card.querySelector(':scope > details');
    if (oldDetails) {
      const summary = oldDetails.querySelector(':scope > summary');
      const bodyInner = oldDetails.querySelector(':scope > .details-body') || oldDetails;
      // 把 summary 包装成统一的 .card-title（如果它还不是）
      if (summary) {
        summary.classList.add('card-title');
        summary.style.cursor = 'pointer';
        // 把 summary 插到 details 之前
        card.insertBefore(summary, oldDetails);
      }
      // 把 details 内部所有节点（除 summary）移到临时 fragment
      const frag = document.createDocumentFragment();
      Array.from(bodyInner.childNodes).forEach(n => frag.appendChild(n));
      // 删除 details
      card.removeChild(oldDetails);
      // 把 fragment 中的节点暂存，稍后统一包裹
      // 我们用一个临时 marker 记录这些节点
      card.__pendingBodyNodes = frag;
    }

    // 找到标题元素（.card-title）
    const title = card.querySelector(':scope > .card-title');
    if (!title) return;

    // 在标题右侧（card-title-right，否则整个 title 末尾）插入箭头
    let arrowAnchor = title.querySelector('.card-title-right') || title;
    const arrow = document.createElement('span');
    arrow.className = 'card-fold-arrow';
    arrow.textContent = '▾';
    arrowAnchor.appendChild(arrow);

    // 收集标题之后的所有兄弟节点，包进 .card-body
    const body = document.createElement('div');
    body.className = 'card-body';
    // 先把 details 解构出来的 pending 节点放进去
    if (card.__pendingBodyNodes) body.appendChild(card.__pendingBodyNodes);
    // 再把标题之后的兄弟节点移过来
    let node = title.nextSibling;
    while (node) {
      const next = node.nextSibling;
      body.appendChild(node);
      node = next;
    }
    // 把 body 追加到卡片末尾
    card.appendChild(body);

    // 还原折叠状态
    const collapsed = !!states[cardId];
    if (collapsed) card.classList.add('collapsed');
    // 【修改点】折叠状态恢复后立即补上概览数据
    updateCardOverview(card);

    // 点击标题切换折叠（click + touchend 双绑定）
    const toggle = (e) => {
      // 避免点到标题内的按钮/输入框时误触发（如视图切换 tab、清空按钮）
      if (e.target.closest('button, input, select, textarea, a, .view-tab, [data-nofold]')) return;
      const isCollapsed = card.classList.toggle('collapsed');
      saveCardState(cardId, isCollapsed);
      // 【修改点】折叠/展开时同步插入或移除概览数据
      updateCardOverview(card);
    };
    bindTap(title, toggle);

    card.dataset.collapseInit = '1';
  });
}

/* ============================================
   总刷新
   ============================================ */
function refreshAll() {
  normalizeCheckins();
  applyTheme(); renderHeader(); renderTodos();
  renderCheckins(); renderMoodCalendar(); renderQuote(); renderNote();
  renderJourney(); applyModuleVisibility();
  // 【修改点】折叠中的卡片概览数据也随数据变化实时刷新
  updateCardOverviews();
  document.querySelectorAll('#todoViewTabs .view-tab').forEach(el => el.classList.toggle('active', el.dataset.view === data.todoViewMode));
  document.querySelectorAll('#checkinViewTabs .view-tab').forEach(el => el.classList.toggle('active', el.dataset.mode === data.checkinViewMode));
  document.getElementById('todoSearch').value = data.todoSearch || '';
  // 强制给日期输入框赋值为今天，避免出现 yyyy/mm/日 的“伪乱码”
  // 默认填入今天的年月日
  const today = todayStr().split('-');
  const yEl = document.getElementById('filterYear');
  const mEl = document.getElementById('filterMonth');
  const dEl = document.getElementById('filterDay');
  if (yEl && !yEl.value && !mEl.value && !dEl.value) {
    yEl.value = today[0];
    mEl.value = today[1];
    dEl.value = today[2];
  }
  if (!journeyDate) journeyDate = todayStr();
  document.getElementById('journeyDate').value = journeyDate;
}

/* ============================================
   事件绑定
   ============================================ */
function bindTap(el, handler) {
  let touched = false;
  el.addEventListener('touchend', function(e) {
    touched = true; e.preventDefault(); handler(e);
    setTimeout(() => { touched = false; }, 350);
  }, { passive: false });
  el.addEventListener('click', function(e) { if (touched) return; handler(e); });
}

function bindEvents() {
  // 待办
  bindTap(document.getElementById('addTodoBtn'), addTodo);
  document.getElementById('todoInput').addEventListener('keydown', e => { if (e.key==='Enter'){e.preventDefault();addTodo();} });
  document.getElementById('todoInput').addEventListener('blur', debouncedAddFromBlur);
  document.getElementById('todoSearch').addEventListener('input', debounce(e => {
    data.todoSearch = e.target.value; saveData(); renderTodos();
  }, 200));
  const tc = document.getElementById('todoContainer');
  tc.addEventListener('click', handleTodoClick);
  tc.addEventListener('click', handleGroupToggle);
  document.getElementById('clearDoneBtn').addEventListener('click', clearDone);

    // --- 自定义模糊日期联动逻辑 ---
  const yInput = document.getElementById('filterYear');
  const mInput = document.getElementById('filterMonth');
  const dInput = document.getElementById('filterDay');
  const hiddenPicker = document.getElementById('hiddenDatePicker');

  // 用户手动输入时触发过滤
  [yInput, mInput, dInput].forEach(el => {
    el.addEventListener('input', () => { renderTodos(); });
  });

  // 点击日历图标，唤起原生选择器
  document.getElementById('openCalendarBtn').addEventListener('click', () => {
    if (hiddenPicker.showPicker) hiddenPicker.showPicker(); // 现代浏览器API
    else hiddenPicker.click(); // 兼容旧版
  });

  // 从日历选择后，拆解填入三个输入框
  hiddenPicker.addEventListener('change', (e) => {
    const val = e.target.value; // 格式为 YYYY-MM-DD
    if (val) {
      const [y, m, d] = val.split('-');
      yInput.value = y;
      mInput.value = m;
      dInput.value = d;
      renderTodos();
    }
  });

  // 【删除】原"习惯"卡片的 addHabitBtn / habitInput 绑定已随卡片合并移除

  // 每日打卡
  document.getElementById('checkinContainer').addEventListener('click', e => {
    const a = e.target.closest('[data-checkin-add]'); if (a) { checkinAdd(a.dataset.checkinAdd); return; }
    const m = e.target.closest('[data-checkin-minus]'); if (m) { checkinMinus(m.dataset.checkinMinus); return; }
    const d = e.target.closest('[data-checkin-del]'); if (d) { deleteCheckin(d.dataset.checkinDel); return; }
    const t = e.target.closest('[data-target-edit]'); if (t) { editTarget(t.dataset.targetEdit); return; }
    const tag = e.target.closest('[data-tag-id]');
    if (tag) {
      const id = tag.dataset.tagId;
      const item = data.checkins.find(x => String(x.id) === String(id));
      if (item) {
        const op = confirm(`「${item.name}」当前 ${item.count}/${item.target}\n\n确定 = +1\n取消 = -1`);
        if (op) checkinAdd(id); else checkinMinus(id);
      }
    }
  });
  document.getElementById('checkinViewTabs').addEventListener('click', e => {
    const tab = e.target.closest('.view-tab'); if (!tab) return;
    data.checkinViewMode = tab.dataset.mode; saveData();
    document.querySelectorAll('#checkinViewTabs .view-tab').forEach(el => el.classList.toggle('active', el===tab));
    renderCheckins();
  });

  // 【修改点】新建习惯弹窗绑定（元素来自升级版 index.html，缺失时跳过）
  safeBind('openHabitFormBtn', 'click', openHabitForm);
  safeBind('hfSubmit', 'click', submitHabitForm);
  safeBind('hfCancel', 'click', closeHabitForm);
  safeBind('hfClose', 'click', closeHabitForm);
  safeBind('habitFormMask', 'click', e => { if (e.target === e.currentTarget) closeHabitForm(); });
  safeBind('hfName', 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitHabitForm(); } });
  safeBind('habitIconPicker', 'click', e => {
    const opt = e.target.closest('.habit-icon-option');
    if (!opt) return;
    opt.parentElement.querySelectorAll('.habit-icon-option').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
  });

  // 心情
  document.getElementById('moodEmojis').addEventListener('click', e => {
    if (e.target.classList.contains('mood-emoji')) selectMoodEmoji(e.target.dataset.mood);
  });
  document.getElementById('moodNote').addEventListener('input', saveMoodNote);
  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if (calMonth<0){calMonth=11;calYear--;} renderMoodCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if (calMonth>11){calMonth=0;calYear++;} renderMoodCalendar();
  });
  document.getElementById('calGrid').addEventListener('click', e => {
    const day = e.target.closest('.cal-day'); if (!day) return;
    const ds = day.dataset.date;
    selectMoodDate(ds);   // 更新选中态（选中态仍保留）
    openMoodDetail(ds);   // 【修改点】点击日期弹出当天详情
  });

  // 【修改点】心情详情弹窗绑定（元素来自升级版 index.html，缺失时跳过）
  safeBind('mdClose', 'click', closeMoodDetail);
  safeBind('moodDetailModal', 'click', e => { if (e.target === e.currentTarget) closeMoodDetail(); });

  // 每日一句
  document.getElementById('newQuoteBtn').addEventListener('click', nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click', favoriteCurrentQuote);
  document.getElementById('favoritesItems').addEventListener('click', e => {
    const del = e.target.closest('[data-fav-del]'); if (del) deleteFavorite(Number(del.dataset.favDel));
  });

  // 便签
  document.getElementById('noteArea').addEventListener('input', debounce(saveNote, 500));

  // 主题
  document.getElementById('themeToggle').addEventListener('click', () => {
    data.darkMode = !data.darkMode; saveData(); applyTheme();
    document.getElementById('darkModeToggle').classList.toggle('on', data.darkMode);
  });

  // 设置面板
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('settingsOverlay').addEventListener('click', e => { if (e.target===e.currentTarget) closeSettings(); });

  // 昵称（失焦保存 + Toast）
  document.getElementById('nicknameInput').addEventListener('change', e => {
    data.nickname = e.target.value.trim() || '小伙伴';
    saveData(); renderHeader();
    showToast('个人信息已保存');
  });

  // 头像 emoji 选择
  document.getElementById('avatarPicker').addEventListener('click', e => {
    if (e.target.classList.contains('emoji-option')) {
      applyAvatar(e.target.dataset.emoji, 'emoji');
    }
  });

  // 上传本地图片
  document.getElementById('uploadAvatarBtn').addEventListener('click', () => {
    document.getElementById('avatarFileInput').click();
  });
  document.getElementById('avatarFileInput').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过 2MB'); e.target.value=''; return; }
    const reader = new FileReader();
    reader.onload = ev => {
      applyAvatar(ev.target.result, 'local');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // 网络图片 URL
  document.getElementById('avatarUrlInput').addEventListener('change', e => {
    const url = e.target.value.trim();
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) { showToast('请输入以 http(s):// 开头的链接'); return; }
    applyAvatar(url, 'url');
  });

  // 点击顶部头像打开设置
  document.getElementById('avatar').addEventListener('click', openSettings);

  // 主题色
  document.getElementById('colorPicker').addEventListener('click', e => {
    if (e.target.classList.contains('color-dot')) {
      data.themeColor = e.target.dataset.color; saveData(); applyTheme();
      document.querySelectorAll('.color-dot').forEach(el => el.classList.toggle('active', el===e.target));
      showToast('主题色已保存');
    }
  });
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    data.darkMode = !data.darkMode; saveData(); applyTheme();
    document.getElementById('darkModeToggle').classList.toggle('on', data.darkMode);
  });
  document.querySelectorAll('.toggle[data-module]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.module; data.modules[k] = !data.modules[k]; saveData(); applyModuleVisibility();
    });
  });
  document.getElementById('clearCheckinsBtn').addEventListener('click', clearAllCheckins);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', importData);
  document.getElementById('resetBtn').addEventListener('click', resetData);

  // 坚持历程日期选择
  document.getElementById('journeyDate').addEventListener('change', e => {
    journeyDate = e.target.value || todayStr();
    renderJourney();
  });

  // 坚持历程详情区的事件委托
  document.getElementById('journeyDetail').addEventListener('click', e => {
    const todoCk = e.target.closest('[data-journey-todo]');
    if (todoCk) { journeyToggleTodo(todoCk.dataset.journeyTodo); return; }
    const addBtn = e.target.closest('[data-journey-check-add]');
    if (addBtn) { journeyCheckAdd(addBtn.dataset.journeyCheckAdd, addBtn.dataset.date); return; }
    const minusBtn = e.target.closest('[data-journey-check-minus]');
    if (minusBtn) { journeyCheckMinus(minusBtn.dataset.journeyCheckMinus, minusBtn.dataset.date); return; }
    const moodBtn = e.target.closest('[data-journey-mood]');
    if (moodBtn) { journeySelectMood(moodBtn.dataset.journeyMood, moodBtn.dataset.date); return; }
  });
  // 心情笔记输入
  document.getElementById('journeyDetail').addEventListener('input', debounce(e => {
    if (e.target.matches('[data-journey-mood-note]')) {
      journeySaveMoodNote(e.target.dataset.journeyMoodNote, e.target.value);
    }
  }, 500));
}

// ========== 【分区 6】页面初始化入口（主业务启动：读数据 → 包裹卡片 → 绑事件 → 首渲染） ==========
// ---------- 启动 ----------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  selectedMoodDate = todayStr();
  journeyDate = todayStr();
  initCollapsibleCards();  // 先动态包裹所有卡片，再绑定事件和渲染内容
  bindEvents();
  refreshAll();
});

/* ============================================
   【补充实现】设置面板 / 头像 / 数据导入导出
   —— 原文件里 openSettings、closeSettings、applyAvatar、exportData、
      importData、resetData 这 6 个函数只有调用、没有定义。
      缺了它们，bindEvents() 执行到「设置」按钮那一行就会抛出
      ReferenceError: openSettings is not defined，后面的绑定全部失效，
      且 DOMContentLoaded 回调中断导致 refreshAll() 不执行（页面数据区空白）。
      这里按既有数据模型补齐实现，不改动上面任何原有逻辑。
   ============================================ */
function openSettings() {
  const overlay = document.getElementById('settingsOverlay');
  if (!overlay) return;
  overlay.classList.add('open');            // CSS: .settings-overlay.open { display:flex }
  const nickname = document.getElementById('nicknameInput');
  if (nickname) nickname.value = data.nickname || '';
  renderAvatar(document.getElementById('avatarPreviewSm'));   // 头像预览
  // 主题色选中态
  document.querySelectorAll('.color-dot').forEach(el => el.classList.toggle('active', el.dataset.color === data.themeColor));
  // 深色模式开关
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) darkToggle.classList.toggle('on', !!data.darkMode);
  // 模块开关
  document.querySelectorAll('.toggle[data-module]').forEach(el => el.classList.toggle('on', !!data.modules[el.dataset.module]));
}

function closeSettings() {
  const overlay = document.getElementById('settingsOverlay');
  if (overlay) overlay.classList.remove('open');
}

// 保存头像（支持 emoji / 本地图片 Base64 / 网络 URL，三者统一交给 renderAvatar 渲染）
function applyAvatar(value, source) {
  if (!value) return;
  data.avatar = value;
  saveData();
  renderHeader();                                            // 顶部头像
  renderAvatar(document.getElementById('avatarPreviewSm'));  // 设置面板预览
  // emoji 选中态
  document.querySelectorAll('.emoji-option').forEach(el =>
    el.classList.toggle('active', source === 'emoji' && el.dataset.emoji === value)
  );
  showToast('头像已更新');
}

// 导出备份：生成 JSON 文件直接下载
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'novarise-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('已导出数据备份');
}

// 导入备份：文件内容经过 migrateData 兼容迁移后再落盘
function importData(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      data = migrateData(JSON.parse(ev.target.result));
      saveData();
      refreshAll();
      showToast('数据已导入');
    } catch (err) {
      console.warn('导入失败', err);
      showToast('导入失败：文件格式不正确');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetData() {
  if (!confirm('确定恢复默认数据吗？当前所有待办、打卡、心情记录都会被清空。')) return;
  data = defaultData();
  saveData();
  refreshAll();
  showToast('已恢复默认');
}

/* ============================================
   【新增 A】多游戏数据面板
   - mockGameData：假数据（连真实接口前，先用它跑通交互）
   - renderGameDashboard(gameId)：把数据填进 mod1~mod4
   - showGameDashboard / backToLifePanel：面板与生活卡片互斥切换
   ============================================ */

// ========== 【分区 4】游戏面板业务逻辑（游戏切换 / 查分请求 / 数据渲染） ==========
// 亮点标签的三种配色（沿用 index.html 里原有标签的配色，保证视觉一致）
const GD_TAG_COLORS = {
  blue: 'background:rgba(108,180,238,0.16);color:#3d7ea6;',
  green: 'background:rgba(107,203,119,0.16);color:#3f7d49;',
  amber: 'background:rgba(255,179,71,0.18);color:#9a6b1f;',
};

/* ---------- 【本轮改造】真实后端地址 ----------
   后端 Python 服务通过内网穿透部署，已替代本地的 127.0.0.1:8080。
   以后换隧道域名，只改这一行。 */
const API_BASE = 'https://Si00008-novarise-api.ms.show';

// 游戏 ID → 显示名（菜单与面板共用；接口没返回 label 时用它兜底）
const GD_GAME_LABELS = {
  maimai: '舞萌 DX',
  dancecube: '舞立方',
  lol: 'LOL',
  hok: '王者荣耀',
  valorant: '瓦罗兰特',
};

// 请求序号：连点不同游戏时只认最后一次点击的结果，避免先发的慢响应覆盖后发的新数据
let gdRequestSeq = 0;

// 假数据：菜单里 5 个游戏都配了数据，避免点「王者荣耀 / 舞立方」时空白。
// 现在真实数据走接口，这份 mock 只作为离线演示 / 接口字段结构参考保留。
const mockGameData = {
  maimai: {
    label: '舞萌 DX',
    player: { avatar: '🎵', name: 'MaimaiPlayer', level: 'Lv.168', rank: 'rating 13.86', sub: '标准谱 · 稳定型玩家' },
    stats: [
      { label: '总场次', value: '1204' },
      { label: '最高评级', value: 'SSS' },
      { label: '最高连击', value: '1423' },
      { label: '平均 rating', value: '13.86' },
    ],
    matches: [
      { main: '✅ SSS · Glorious Crown', sub: '达成率 100.6%' },
      { main: '✅ SS · BAD∞∞∞', sub: '达成率 99.2%' },
      { main: '❌ A · QZKago Requiem', sub: '达成率 94.8%' },
      { main: '✅ SSS · 系ぎて', sub: '达成率 101.3%' },
      { main: '✅ S · 麒麟', sub: '达成率 97.5%' },
    ],
    highlights: [
      { text: '🎵 1423 连击（个人最高）', color: 'blue' },
      { text: '🏆 全曲 SSS 38 首', color: 'green' },
      { text: '📈 rating 月增长 +0.42', color: 'amber' },
    ],
    tip: '音游指标看评级 / 达成率 / 连击；接入 maimai DX NET 后这里换成真实成绩。',
  },
  dancecube: {
    label: '舞立方',
    player: { avatar: '🕺', name: 'CubePlayer', level: 'Lv.52', rank: 'S+', sub: '8K 模式 · 稳定型玩家' },
    stats: [
      { label: '总场次', value: '508' },
      { label: '最高评级', value: 'S+' },
      { label: '最高连击', value: '897' },
      { label: '平均准确率', value: '96.4%' },
    ],
    matches: [
      { main: '✅ S+ · Neon Drive', sub: '准确率 98.2%' },
      { main: '✅ S · Pulse', sub: '准确率 97.1%' },
      { main: '✅ S · Overdrive', sub: '准确率 96.8%' },
      { main: '❌ A+ · 极夜', sub: '准确率 93.5%' },
      { main: '✅ S+ · 起风了', sub: '准确率 98.6%' },
    ],
    highlights: [
      { text: '🕺 897 连击（个人最高）', color: 'blue' },
      { text: '🏆 8K 难度全曲 S 以上', color: 'green' },
      { text: '📈 准确率月均 +1.2%', color: 'amber' },
    ],
    tip: '舞立方指标看评级 / 准确率 / 连击；接入机台成绩后这里换成真实数据。',
  },
  lol: {
    label: 'LOL',
    player: { avatar: '🏆', name: 'Summer#示例', level: 'Lv.168', rank: '钻石 I', sub: '峡谷之巅 · 主玩中单' },
    stats: [
      { label: '总场次', value: '428' },
      { label: '胜率', value: '56.3%' },
      { label: '最高连胜', value: '9 连胜' },
      { label: '场均 KDA', value: '4.2' },
    ],
    matches: [
      { main: '✅ 胜利 · 中单阿狸', sub: '13/2/9 · 32 分钟' },
      { main: '❌ 失败 · 打野佛耶戈', sub: '5/8/6 · 28 分钟' },
      { main: '✅ 胜利 · 中单辛德拉', sub: '9/3/12 · 35 分钟' },
      { main: '✅ 胜利 · AD 崔丝塔娜', sub: '11/1/8 · 24 分钟' },
      { main: '❌ 失败 · 辅助洛', sub: '2/7/14 · 39 分钟' },
    ],
    highlights: [
      { text: '⚡ 单月最高连胜 9 场', color: 'blue' },
      { text: '🎯 阿狸胜率 68%', color: 'green' },
      { text: '🏅 峡谷之巅 钻石 I', color: 'amber' },
    ],
    tip: '近 30 天胜率高于同段位平均，中单英雄池稳定；接入 Riot API 后换成真实对局。',
  },
  hok: {
    label: '王者荣耀',
    player: { avatar: '👑', name: '召唤师示例', level: 'Lv.30', rank: '王者 32 星', sub: '主玩射手 · 五杀 3 次' },
    stats: [
      { label: '总场次', value: '966' },
      { label: '胜率', value: '61.2%' },
      { label: '最高段位', value: '王者 32 星' },
      { label: 'MVP 率', value: '34.5%' },
    ],
    matches: [
      { main: '✅ 胜利 · 后羿 12/3/8', sub: 'MVP · 18 分钟' },
      { main: '✅ 胜利 · 伽罗 9/2/11', sub: 'MVP · 21 分钟' },
      { main: '❌ 失败 · 孙尚香 6/7/4', sub: '24 分钟' },
      { main: '✅ 胜利 · 狄仁杰 10/1/9', sub: 'MVP · 16 分钟' },
      { main: '❌ 失败 · 鲁班七号 4/9/6', sub: '27 分钟' },
    ],
    highlights: [
      { text: '👑 赛季最高 王者 32 星', color: 'blue' },
      { text: '🎯 后羿胜率 66%', color: 'green' },
      { text: '🏅 MVP 率 34.5%', color: 'amber' },
    ],
    tip: '王者指标看胜率 / MVP 率 / 段位峰值；接入营地数据后换成真实战绩。',
  },
  valorant: {
    label: '瓦罗兰特',
    player: { avatar: '🔫', name: 'Ace#示例', level: 'Lv.76', rank: '不朽 I', sub: '主玩捷风 · 突破位' },
    stats: [
      { label: '总场次', value: '312' },
      { label: '胜率', value: '58.4%' },
      { label: '场均 ACS', value: '241' },
      { label: '爆头率', value: '27.6%' },
    ],
    matches: [
      { main: '✅ 胜利 · 捷风 26/12', sub: '亚海悬城 · 13:9' },
      { main: '✅ 胜利 · 蕾娜 22/10', sub: '源工重镇 · 13:7' },
      { main: '❌ 失败 · 捷风 18/19', sub: '隐世修所 · 11:13' },
      { main: '✅ 胜利 · 菲德 15/11', sub: '森寒冬港 · 13:10' },
      { main: '❌ 失败 · 霓虹 20/17', sub: '裂变峡谷 · 12:14' },
    ],
    highlights: [
      { text: '🎯 单场最高 ACS 318', color: 'blue' },
      { text: '💥 四杀 6 次', color: 'green' },
      { text: '🏅 不朽 I（本赛季）', color: 'amber' },
    ],
    tip: 'FPS 指标看 ACS / 爆头率 / 胜率；接入 Riot API 后换成真实对局。',
  },
};

/* ---------- 【本轮改造】真实接口请求 ---------- */

/**
 * 拉取某个游戏的真实数据
 * @param {string} gameId maimai / dancecube / lol / hok / valorant
 * @param {number} timeoutMs 超时毫秒数（隧道链路慢，给足 12 秒）
 * @returns {Promise<object>} 结构与 mockGameData 一致：{label, player, stats, matches, highlights, tip}
 */
async function fetchRealGameData(gameId, timeoutMs) {
  const url = API_BASE + '/api/get_game_data?game=' + encodeURIComponent(gameId);
  const limit = timeoutMs || 12000;

  /* ---------- 【新增】maimai 专用：透传水鱼 Token ----------
     后端 FastAPI 无状态，只认请求头 X-Import-Token。
     其他游戏（dancecube / lol / hok / valorant）走下面的原逻辑，一行未改。 */
  const extraHeaders = {};
  if (gameId === 'maimai') {
    const token = readDfToken();
    if (!token) {
      // 没有 Token 就不发网络请求，交给 showGameDashboard 渲染占位 + Toast
      const noTokenErr = new Error('未绑定Token，无法获取成绩');
      noTokenErr.code = 'NO_DF_TOKEN';
      throw noTokenErr;
    }
    extraHeaders['Authorization'] = 'Bearer ' + token;
  }

  // 手动超时：避免「加载中…」一直转圈
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, limit);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: Object.assign({ 'Accept': 'application/json' }, extraHeaders),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      // 4xx 多为鉴权/路径问题，5xx 是后端报错，原样带出来方便定位。
      // 【新增】仅 maimai：把后端返回的 detail 拼进错误信息，Token 失效提示就在里面。
      let detail = '';
      if (gameId === 'maimai') {
        try {
          const errBody = await res.json();
          if (errBody && errBody.detail) detail = ' ' + String(errBody.detail);
        } catch (e) { /* 响应不是 JSON 就保持原样 */ }
      }
      throw new Error('HTTP ' + res.status + ' ' + (res.statusText || '') + detail);
    }

    const raw = await res.json();

    // 兼容两种返回：直接给游戏对象，或包一层 { code:0, data:{...} }
    const data = (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object') ? raw.data : raw;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('返回格式不是对象');
    }
    if (!data.player && !data.stats) {
      throw new Error('字段不符：未找到 player / stats');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// 把异常翻译成能直接排查的话（Failed to fetch 十有八九是隧道挂了或后端没开 CORS）
function explainGdError(err) {
  const msg = (err && err.message) ? err.message : String(err);

  if (err && err.name === 'AbortError') {
    return '请求超时（12 秒内没返回）。\n检查隧道是否还活着：浏览器直接打开 ' + API_BASE + '/docs 看看。';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return '请求被中断（Failed to fetch）。按这个顺序查：\n' +
           '① 隧道 ' + API_BASE + ' 当前能不能访问（浏览器打开 ' + API_BASE + '/docs）；\n' +
           '② 后端有没有配 CORS 中间件（没配的话浏览器会直接拦掉响应）；\n' +
           '③ 页面如果是 https 打开，后端也必须是 https（混合内容会被拦）。';
  }
  if (/^HTTP 4\d\d/.test(msg)) {
    return '接口拒绝：' + msg + '\n401/403 查后端鉴权或隧道拦截，404 查 /api/get_game_data 路径拼写。';
  }
  if (/^HTTP 5\d\d/.test(msg)) {
    return '后端出错：' + msg + '\n去 Python 端看日志，通常是查询参数或数据源异常。';
  }
  return '加载失败：' + msg;
}

// 加载中：四个模块先铺占位，点击后立刻有反馈
function renderGdLoading(gameId) {
  const label = GD_GAME_LABELS[gameId] || gameId;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('gdGameName', label + ' · 加载中…');
  setText('gdPlayerTag', '正在获取数据');
  setText('gdPlayerName', '加载中…');
  setText('gdPlayerSub', '正在向 ' + API_BASE + ' 请求');
  setText('gdPlayerLevel', '等级 —');
  setText('gdPlayerRank', '段位 —');
  const avatarEl = document.getElementById('gdAvatar');
  if (avatarEl) avatarEl.textContent = '⏳';

  const statGrid = document.getElementById('gdStatsGrid');
  if (statGrid) {
    statGrid.innerHTML = [1, 2, 3, 4].map(() => `
      <div style="padding:10px 12px;border-radius:12px;background:var(--bg,#f1f3f6);">
        <div style="font-size:11px;color:var(--text-secondary,#666);">加载中</div>
        <div class="gd-stat-value" style="font-size:20px;font-weight:700;color:var(--text-secondary,#666);margin-top:2px;">—</div>
      </div>`).join('');
  }

  const matchList = document.getElementById('gdMatchesList');
  if (matchList) {
    matchList.innerHTML = [1, 2, 3, 4, 5].map(() => `
      <div class="gd-match-row" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:var(--bg,#f1f3f6);font-size:13px;color:var(--text-secondary,#666);">
        <span>加载中…</span><span style="font-size:12px;">—</span>
      </div>`).join('');
  }

  const highlightList = document.getElementById('gdHighlightsList');
  if (highlightList) {
    highlightList.innerHTML = '<span class="gd-highlight-tag" style="font-size:12px;padding:5px 10px;border-radius:20px;background:var(--bg,#f1f3f6);color:var(--text-secondary,#666);">加载中…</span>';
  }

  const tipEl = document.getElementById('gdTipText');
  if (tipEl) tipEl.textContent = '正在请求 ' + API_BASE + '/api/get_game_data?game=' + gameId;
}

// 失败：错误摊在面板里，并给一个「重试」按钮（不必刷新整页）
function renderGdError(gameId, err) {
  const label = GD_GAME_LABELS[gameId] || gameId;
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('gdGameName', label + ' · 加载失败');
  setText('gdPlayerTag', '请求出错');
  setText('gdPlayerName', '数据没拿到');
  setText('gdPlayerSub', '下面的错误信息可直接对照排查');
  setText('gdPlayerLevel', '等级 —');
  setText('gdPlayerRank', '段位 —');
  const avatarEl = document.getElementById('gdAvatar');
  if (avatarEl) avatarEl.textContent = '⚠️';

  const statGrid = document.getElementById('gdStatsGrid');
  if (statGrid) {
    statGrid.innerHTML = `
      <div style="grid-column:1/-1;padding:12px;border-radius:12px;background:rgba(255,107,157,0.10);border:1px dashed rgba(255,107,157,0.45);font-size:12px;line-height:1.65;color:#a33;white-space:pre-wrap;">${escapeHtml(explainGdError(err))}</div>
      <div style="grid-column:1/-1;">
        <button type="button" class="btn btn-ghost btn-sm" id="gdRetryBtn" style="width:100%;">🔄 重试</button>
      </div>`;
    const retry = document.getElementById('gdRetryBtn');
    if (retry) retry.addEventListener('click', function () { showGameDashboard(gameId); });
  }

  const matchList = document.getElementById('gdMatchesList');
  if (matchList) {
    matchList.innerHTML = '<div class="gd-match-row" style="padding:10px;border-radius:10px;background:var(--bg,#f1f3f6);font-size:13px;color:var(--text-secondary,#666);">暂无战绩数据（接口请求失败）</div>';
  }

  const highlightList = document.getElementById('gdHighlightsList');
  if (highlightList) {
    highlightList.innerHTML = '<span class="gd-highlight-tag" style="font-size:12px;padding:5px 10px;border-radius:20px;background:var(--bg,#f1f3f6);color:var(--text-secondary,#666);">暂无亮点数据</span>';
  }

  const tipEl = document.getElementById('gdTipText');
  if (tipEl) tipEl.textContent = '请求地址：' + API_BASE + '/api/get_game_data?game=' + gameId + '（失败原因见上方）';
}

// 把数据填进 mod1~mod4（标题、玩家信息、四项核心数据、5 场战绩、3 个亮点）
// data 为接口返回的游戏对象；不传时回落到 mockGameData（仅离线演示用）
function renderGameDashboard(gameId, data) {
  const gd = document.getElementById('gameDashboard');
  if (!gd) return false;
  const d = data || mockGameData[gameId];
  if (!d) { showToast('「' + gameId + '」的数据还没接入'); return false; }

  // 接口字段缺一半时也不要把页面弄崩：缺什么用什么兜底
  const player = d.player || {};
  const stats = Array.isArray(d.stats) ? d.stats : [];
  const matches = Array.isArray(d.matches) ? d.matches : [];
  const highlights = Array.isArray(d.highlights) ? d.highlights : [];
  const label = d.label || GD_GAME_LABELS[gameId] || gameId;

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  // 模块1：玩家信息
  setText('gdGameName', label + ' · 玩家信息');
  setText('gdPlayerTag', '游戏：' + label);
  setText('gdPlayerName', player.name || '—');
  setText('gdPlayerSub', player.sub || '—');
  setText('gdPlayerLevel', player.level || '等级 —');
  setText('gdPlayerRank', player.rank || '段位 —');
  const avatarEl = document.getElementById('gdAvatar');
  if (avatarEl) avatarEl.textContent = player.avatar || '🎮';

  // 模块2：核心数据（重建 4 个指标格，保留 .gd-stat-value 类以便复用既有样式）
  const statGrid = document.getElementById('gdStatsGrid');
  if (statGrid) {
    statGrid.innerHTML = stats.map(s => `
      <div style="padding:10px 12px;border-radius:12px;background:var(--bg,#f1f3f6);">
        <div style="font-size:11px;color:var(--text-secondary,#666);">${escapeHtml(s.label)}</div>
        <div class="gd-stat-value" style="font-size:20px;font-weight:700;color:var(--text,#222);margin-top:2px;">${escapeHtml(s.value)}</div>
      </div>`).join('');
  }

  // 模块3：近期战绩（5 行；隔行变色由 .gd-match-row 的 CSS 负责，这里不要写死背景）
  const matchList = document.getElementById('gdMatchesList');
  if (matchList) {
    matchList.innerHTML = matches.map(m => `
      <div class="gd-match-row" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:var(--bg,#f1f3f6);font-size:13px;color:var(--text,#222);">
        <span>${escapeHtml(m.main)}</span>
        <span style="font-size:12px;color:var(--text-secondary,#666);">${escapeHtml(m.sub)}</span>
      </div>`).join('');
  }

  // 模块4：特色亮点（三个标签沿用原有三色）
  const highlightList = document.getElementById('gdHighlightsList');
  if (highlightList) {
    highlightList.innerHTML = highlights.map(h =>
      `<span class="gd-highlight-tag" style="font-size:12px;padding:5px 10px;border-radius:20px;${GD_TAG_COLORS[h.color] || GD_TAG_COLORS.blue}">${escapeHtml(h.text)}</span>`
    ).join('');
  }
  // 模块4 底部说明：首次渲染时给原占位 div 打上 id，之后直接复用
  let tipEl = document.getElementById('gdTipText');
  if (!tipEl) {
    const cand = Array.prototype.slice.call(document.querySelectorAll('#mod4-highlights div'))
      .filter(el => !el.children.length && el.textContent.indexOf('接入') > -1)[0];
    if (cand) { cand.id = 'gdTipText'; tipEl = cand; }
  }
  if (tipEl) tipEl.textContent = d.tip || '';

  return true;
}

/* ---------- 【新增｜分区 4】水鱼 Token：读取与占位渲染 ----------------------------
   写入口在「分区 3」的卡片模块，这里只负责读取 + 面板占位。
   key 固定为 novarise_df_token（与分区 3 完全一致）。
   ----------------------------------------------------------------------------- */
const DF_TOKEN_STORAGE_KEY = 'novarise_df_token';

function readDfToken() {
  try { return (localStorage.getItem(DF_TOKEN_STORAGE_KEY) || '').trim(); } catch (e) { return ''; }
}

// 面板当前显示的游戏；返回生活面板时置空（供分区 3 的绑定/解绑钩子判断）
let gdCurrentGame = null;

// 判断异常是否属于「Token 无效 / 过期」：后端 detail 形如「水鱼 Import-Token 无效或已过期」
function isDfTokenError(err) {
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  return /(import-token|import token|token)[\s\S]{0,16}(无效|过期|有误|invalid|expired)/i.test(msg)
      || /HTTP\s*(401|403)/i.test(msg);
}

// 未绑定 / Token 失效：把舞萌面板整块替换成占位提示
function renderGdTokenMissing(gameId, reason) {
  const label = GD_GAME_LABELS[gameId] || gameId;
  const hint = reason || '未绑定Token，无法获取成绩';
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('gdGameName', label + ' · 玩家信息');
  setText('gdPlayerTag', '未绑定 Token');
  setText('gdPlayerName', hint);
  setText('gdPlayerSub', '请在上方「🔗 绑定水鱼查分器 Token」处填入你的 Import-Token');
  setText('gdPlayerLevel', '等级 —');
  setText('gdPlayerRank', '段位 —');
  const avatarEl = document.getElementById('gdAvatar');
  if (avatarEl) avatarEl.textContent = '🔒';

  const statGrid = document.getElementById('gdStatsGrid');
  if (statGrid) {
    statGrid.innerHTML = [1, 2, 3, 4].map(() => `
      <div style="padding:10px 12px;border-radius:12px;background:var(--bg,#f1f3f6);">
        <div style="font-size:11px;color:var(--text-secondary,#666);">未绑定</div>
        <div class="gd-stat-value" style="font-size:20px;font-weight:700;color:var(--text-secondary,#666);margin-top:2px;">—</div>
      </div>`).join('');
  }

  const matchList = document.getElementById('gdMatchesList');
  if (matchList) {
    matchList.innerHTML = [1, 2, 3, 4, 5].map(() => `
      <div class="gd-match-row" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:var(--bg,#f1f3f6);font-size:13px;color:var(--text-secondary,#666);">
        <span>未绑定 Token</span><span style="font-size:12px;">—</span>
      </div>`).join('');
  }

  const highlightList = document.getElementById('gdHighlightsList');
  if (highlightList) {
    highlightList.innerHTML = '<span class="gd-highlight-tag" style="font-size:12px;padding:5px 10px;border-radius:20px;background:var(--bg,#f1f3f6);color:var(--text-secondary,#666);">绑定 Token 后显示真实亮点</span>';
  }

  // 底部说明复用既有 #gdTipText（首次需按原逻辑给它补 id）
  let tipEl = document.getElementById('gdTipText');
  if (!tipEl) {
    const cand = Array.prototype.slice.call(document.querySelectorAll('#mod4-highlights div'))
      .filter(el => !el.children.length && el.textContent.indexOf('接入') > -1)[0];
    if (cand) { cand.id = 'gdTipText'; tipEl = cand; }
  }
  if (tipEl) tipEl.textContent = hint;
}

// 供「分区 3」Token 卡片调用的两个钩子
window.__nvRefreshMaimai = function () {
  // 只有当前正停留在舞萌面板才需要立刻重拉，否则用户下次点舞萌时自然带上新 Token
  if (gdCurrentGame === 'maimai') showGameDashboard('maimai');
};
window.__nvClearMaimai = function () {
  const gd = document.getElementById('gameDashboard');
  const visible = gd && gd.getAttribute('style') && /display:\s*grid/.test(gd.getAttribute('style'));
  if (visible && gdCurrentGame === 'maimai') {
    renderGdTokenMissing('maimai');
  }
};

// 显示游戏面板：先切到面板并铺「加载中...」，再请求真实数据；失败就把错误落在面板里
async function showGameDashboard(gameId) {
  const gd = document.getElementById('gameDashboard');
  if (!gd) return;

  gdCurrentGame = gameId;        // 【新增】记录当前面板游戏，解绑时据此清空舞萌数据

  const seq = ++gdRequestSeq;    // 记住这一次点击，回包时用它判断自己是否已被新点击取代

  ensureGdBackBtn();
  gd.style.display = 'grid';     // 直接内联覆盖 HTML 上的 display:none

  // 【新增】Token 绑定卡片只服务舞萌：舞萌显示，其余游戏一律隐藏
  const dfCard = document.getElementById('dfTokenCard');
  if (dfCard) dfCard.style.display = (gameId === 'maimai') ? '' : 'none';
  // 隐藏生活卡片；面板内部的 4 张卡（mod1~mod4）必须排除，否则会连面板一起隐藏
  document.querySelectorAll('.card').forEach(card => {
    if (gd.contains(card)) return;
    card.style.display = 'none';
  });
  // 关闭右侧悬浮窗
  const rp = document.getElementById('rightPanel');
  if (rp) rp.style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });   // 回到顶部看面板

  renderGdLoading(gameId);       // 立刻给反馈，别让用户以为没点上

  try {
    const data = await fetchRealGameData(gameId);
    if (seq !== gdRequestSeq) return;            // 期间又点了别的游戏，这次结果作废
    renderGameDashboard(gameId, data);
  } catch (err) {
    if (seq !== gdRequestSeq) return;

    /* 【新增】未绑定 Token：本次请求压根没发出去，面板显示占位 + Toast 引导去绑定 */
    if (err && err.code === 'NO_DF_TOKEN') {
      renderGdTokenMissing(gameId);
      showToast('请先在上方绑定水鱼 Token');
      return;
    }

    /* 【新增】Token 无效 / 过期：面板占位 + Toast 引导解绑重绑 */
    if (gameId === 'maimai' && isDfTokenError(err)) {
      renderGdTokenMissing(gameId, 'Token 无效或已过期');
      showToast('Token无效或已过期，请解绑后重新绑定');
      console.warn('[gameDashboard] Token 失效：', gameId, err);
      return;
    }

    renderGdError(gameId, err);
    console.warn('[gameDashboard] 请求失败：', gameId, err);   // 控制台留完整异常，方便和 DevTools 对
  }
}

// 返回生活面板：隐藏面板、按设置里的模块开关恢复卡片、重新打开右侧悬浮窗
function backToLifePanel() {
  const gd = document.getElementById('gameDashboard');
  if (gd) gd.style.display = 'none';
  gdCurrentGame = null;          // 【新增】面板关闭后不再指向任何游戏

  // 先全部还原，再让 applyModuleVisibility() 按用户配置收一次，避免把已关闭的模块放出来
  document.querySelectorAll('.card').forEach(card => {
    if (gd && gd.contains(card)) return;
    card.style.display = '';
  });
  applyModuleVisibility();

  const rp = document.getElementById('rightPanel');
  if (rp) rp.style.display = '';
  // 清掉游戏选中态
  document.querySelectorAll('.rp-game').forEach(item => {
    item.style.background = 'transparent';
    item.style.fontWeight = '400';
  });
}

// 在 #gameDashboard 内部最上方插入「返回生活面板」按钮
// index.html 里没有这个按钮，这里动态创建，无需改动 HTML
function ensureGdBackBtn() {
  const gd = document.getElementById('gameDashboard');
  if (!gd || gd.querySelector('#gdBackBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'gdBackBtn';
  btn.type = 'button';
  btn.className = 'btn btn-ghost';              // 复用既有按钮风格
  btn.textContent = '← 返回生活面板';
  btn.style.cssText = 'grid-column:1 / -1;justify-self:start;';   // 面板是 grid，按钮独占一行并靠左
  btn.addEventListener('click', backToLifePanel);
  gd.insertBefore(btn, gd.firstChild);
}

// 点击某个游戏项：标记选中态 → 渲染面板
function handleGameClick(item) {
  if (!item) return;
  const gameId = item.dataset.game;
  document.querySelectorAll('.rp-game').forEach(x => {
    x.style.background = 'transparent';
    x.style.fontWeight = '400';
  });
  item.style.background = 'rgba(var(--primary-rgb),0.16)';   // 主题色浅底
  item.style.fontWeight = '600';
  showGameDashboard(gameId);
}

/* ============================================
   【Bug2 修复】右侧游戏面板默认收起
   - 页面加载时强制收掉面板，只留右下角的 🎮 悬浮球作入口
   - 点球展开面板、点面板头部的 ✕ 收起，两者互斥不会同时出现
   ============================================ */
function bindRightPanelToggle() {
  const panel = document.getElementById('rightPanel');
  const openBtn = document.getElementById('rpOpenBtn');
  const closeBtn = document.getElementById('rpCloseBtn');
  if (!panel || !openBtn) return;

  const showPanel = () => {
    panel.style.display = 'block';
    openBtn.style.display = 'none';
  };
  const hidePanel = () => {
    panel.style.display = 'none';
    openBtn.style.display = 'flex';
  };

  openBtn.addEventListener('click', showPanel);
  if (closeBtn) closeBtn.addEventListener('click', hidePanel);

  hidePanel();   // 初始一律收起，盖掉任何被别处改成展开的状态
}

/* ============================================
   【新增 B】AI 聊天悬浮窗（本轮已接真实接口）
   - 悬浮球开关面板
   - 发送：用户气泡 + 「AI 正在思考」占位 → 真实请求返回后替换成 AI 气泡 → 自动滚动到底
   - ⚙️ 用 prompt 采集 API Key，存进 localStorage['user_ai_key']
   - 请求发往 DeepSeek（https://api.deepseek.com/chat/completions），model 固定 deepseek-chat
   - 失败不弹框，直接把原因写进对话气泡
   ============================================ */

/* ---- 【本轮重构】平台配置字典：下拉框的 value 直接就是这里的键，想再加平台往下补一条 ---- */
const AI_PROVIDERS = {
  zhipu: {
    name: '智谱',
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    keyStorage: 'api_key_zhipu',
    keyPrefix: 'sk-',                    // 仅用于 ⚙️ 输入框的提示文案
    note: '免费',
    modelsUrl: '',                       // 智谱没有可靠的公开模型列表接口，留空＝保存 Key 后不自动查模型
    // 智谱端点实测不返回 Access-Control-Allow-Origin，网页直连必被 CORS 拦。
    // 将来若自建了转发层（例如 https://你的代理/api/zhipu），把这一行填上，请求会自动改走代理
    proxyUrl: ''
  },
  doubao: {
    name: '豆包',
    // 火山方舟（Ark）的 OpenAI 兼容端点
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    // 【实测修正】截图里的 doubao-smart-router-250928 调不通（404 InvalidEndpointOrModel.NotFound），
    // 它只是模型页上的展示名，不是 API 的 Model ID。这里改用与 UI「豆包 (Seed-2.1-pro)」对应的正式 Model ID；
    // 也可换成你在方舟控制台开通的其他 Model ID，或自建推理接入点 ep-xxx
    model: 'doubao-seed-2-1-pro-260628',
    keyStorage: 'api_key_doubao',
    keyPrefix: 'ark-',                   // 方舟的 Key 形如 ark-xxxx
    note: '火山方舟 Doubao-Smart-Router',
    modelsUrl: '',                       // 方舟没有对外的模型列表接口，模型名以控制台开通的为准
    // 方舟的错误响应（如 401）实测不带 Access-Control-Allow-Origin，浏览器读不到状态码；
    // 若确认 Key 正确仍报跨域，可填一个转发代理地址，请求会自动改走代理
    proxyUrl: ''
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemini-2.0-flash-exp:free',   // 默认免费模型
    keyStorage: 'api_key_openrouter',
    keyPrefix: 'sk-or-v1-',
    note: '海外免费模型',
    modelsUrl: 'https://openrouter.ai/api/v1/models'   // 公开列表，填了 Key 就能自动查
  },
  // 【本轮新增】魔搭 ModelScope：OpenAI 兼容端点，预检实测 ACAO=* 可浏览器直连
  modelscope: {
    name: '魔搭',
    url: 'https://api-inference.modelscope.cn/v1/chat/completions',
    // 模型 ID 取自 GET /v1/models 的真实可调用列表；想换模型时替换成列表里的其他 id（如
    // Qwen/Qwen3.8-27B、ZhipuAI/GLM-4.7-Flash、deepseek-ai/DeepSeek-V4.1-Flash）即可
    model: 'Qwen/Qwen3.5-27B',
    keyStorage: 'api_key_modelscope',
    keyPrefix: 'ms-',                            // 魔搭的 Key 形如 ms-xxxx
    note: '需先绑定阿里云账号',
    modelsUrl: 'https://api-inference.modelscope.cn/v1/models',   // 实测可用，保存 Key 后自动列出 38 个模型
    proxyUrl: ''
  },
  // 【本轮新增】阿里云百炼（DashScope）：实测本机 Key 可直连且返回 200，预检 ACAO=*
  dashscope: {
    name: '阿里云百炼',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen3.8-flash',              // 默认模型；选了别的会记在 ai_model_dashscope，优先用你选的那个
    keyStorage: 'api_key_dashscope',
    keyPrefix: 'sk-',
    note: '已实测可直连',
    modelsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',   // 实测返回 183 个可用模型
    // 【本轮】开启深度思考：响应流里先推 reasoning_content（思考过程），再推 content（正文）
    extraBody: { enable_thinking: true },
    // 走 SSE 流式解析，才能做到“边想边显示”。不支持流式的平台不要加这一行
    stream: true,
    proxyUrl: ''
  },
  // 以后要接新平台：照上面的结构往下加一条，键名与 index.html 里 option 的 value 保持一致即可
};

const DEFAULT_PROVIDER = 'zhipu';                     // 页面加载默认选中的平台（index.html 第一个 option 也是它）
const AI_KEY_STORAGE = 'user_ai_key';                 // 上一轮的单个全局 Key，只读兼容，不再写入
const AI_KEY_STORAGE_LEGACY = 'novarise_ai_api_key';  // 更早的设置浮层用过的键，同上只读
const THINKING_TEXT = 'AI 正在思考';                   // 思考占位文案（后面的点由定时器递增）

function openAiChat() {
  const panel = document.getElementById('aiChatPanel');
  const input = document.getElementById('aiChatInput');
  if (!panel) return;
  panel.style.display = 'flex';        // 显隐由脚本控制（CSS 只管尺寸、圆角与弹出动画）
  if (input) setTimeout(() => input.focus(), 60);
}

function closeAiChat() {
  const panel = document.getElementById('aiChatPanel');
  if (panel) panel.style.display = 'none';
}

function toggleAiChat() {
  const panel = document.getElementById('aiChatPanel');
  if (!panel) return;
  if (panel.style.display === 'flex') closeAiChat(); else openAiChat();
}

// 追加一条气泡：只挂类名，配色/对齐/圆角全部交给 style.css 的 .ai-msg 系列
function appendAiMessage(text, who) {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;
  const row = document.createElement('div');
  row.className = (who === 'user') ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-ai';
  row.textContent = text;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;     // 自动滚到底
  return row;
}

// 消息区滚到最底（流式逐字输出时每次追加都要滚）
function scrollAiToBottom() {
  const box = document.getElementById('aiChatMessages');
  if (box) box.scrollTop = box.scrollHeight;
}

/* 【本轮新增】流式 AI 气泡：一个虚线框的可折叠「深度思考过程」面板 + 正文容器
   - 思考阶段 details 展开，reasoning_content 逐字填进 thinkBody
   - 正文第一次出现时由调用方把 details.open 置 false（自动收起） */
function appendAiStream() {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;

  const row = document.createElement('div');
  row.className = 'ai-msg ai-msg-ai';

  const think = document.createElement('details');
  // 【本轮】类名统一为 .reasoning-panel（style.css 里与 .ai-think 共用同一套样式）
  think.className = 'reasoning-panel';
  think.open = true;                       // 先展开，让人看到它在想
  const summary = document.createElement('summary');
  summary.textContent = '🤔 深度思考过程';
  const thinkBody = document.createElement('div');
  thinkBody.className = 'reasoning-panel-body';
  think.appendChild(summary);
  think.appendChild(thinkBody);

  const replyBody = document.createElement('div');
  replyBody.className = 'ai-reply';

  row.appendChild(think);
  row.appendChild(replyBody);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;

  return {
    row: row,
    think: think,
    thinkBody: thinkBody,
    replyBody: replyBody,
    replyStarted: false                   // 标记正文是否已经开始输出（只收起一次）
  };
}

// 「正在思考」占位：文字点点由 JS 依次递增，转圈与呼吸动画交给 style.css 的 .ai-msg-thinking
function appendAiThinking() {
  const box = document.getElementById('aiChatMessages');
  if (!box) return null;
  const row = document.createElement('div');
  row.className = 'ai-msg ai-msg-ai ai-msg-thinking';
  row.style.opacity = '0.75';
  row.textContent = THINKING_TEXT;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  let dots = 0;
  row.__thinkingTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    row.textContent = THINKING_TEXT + '.'.repeat(dots);
  }, 400);
  return row;
}

function removeAiThinking(row) {
  if (!row) return;
  if (row.__thinkingTimer) clearInterval(row.__thinkingTimer);
  if (row.parentNode) row.parentNode.removeChild(row);
}

/* ---------------- API Key 读写（按平台各存一把） ---------------- */

// 当前下拉框选中的平台（value 就是 AI_PROVIDERS 的键）；取值异常时回落到默认平台
function getProvider() {
  const sel = document.getElementById('aiModelSelect');
  const v = (sel && sel.value) ? sel.value.trim() : '';
  return v || DEFAULT_PROVIDER;
}

// 取平台配置。找不到时返回“未配置”占位对象，绝不静默回退到别的平台——
// 否则会出现“选豆包、实际在调智谱”这种错配
function getProviderConfig(provider) {
  if (AI_PROVIDERS[provider]) return AI_PROVIDERS[provider];
  return { name: provider || '未配置平台', url: '', model: '', keyStorage: '', unconfigured: true };
}

// 读取某平台的 Key：优先该平台自己的 keyStorage；没有则借用上一轮的全局 Key（只读、不回写，避免串平台）
function getProviderKey(provider) {
  const cfg = getProviderConfig(provider);
  try {
    if (cfg.keyStorage) {
      const own = localStorage.getItem(cfg.keyStorage);
      if (own && own.trim()) return own.trim();
    }
    const legacy = (localStorage.getItem(AI_KEY_STORAGE) || localStorage.getItem(AI_KEY_STORAGE_LEGACY) || '').trim();
    if (legacy) return legacy;
  } catch (e) { /* 隐私模式或禁用 localStorage */ }
  return '';
}

// 保存某平台的 Key，只写该平台自己的 keyStorage，绝不碰别的平台
function saveProviderKey(provider, key) {
  const cfg = getProviderConfig(provider);
  const v = (key || '').trim();
  if (!cfg.keyStorage) return;
  try {
    if (v) localStorage.setItem(cfg.keyStorage, v);
    else localStorage.removeItem(cfg.keyStorage);
  } catch (e) {
    /* 写不进去就算了，不打断聊天流程 */
  }
  refreshAiKeyDot();
}

/* ---- 【本轮新增】按 Key 自动发现模型 ----
   每个平台的配置里多了一个 modelsUrl（模型列表接口）。点 ⚙️ 存好 Key 后，自动去这个接口拉
   该 Key 能用的模型，列出来让你挑一个；选过的模型记在 localStorage['ai_model_<平台键>']，
   之后发请求优先用它，没选过才用 AI_PROVIDERS 里的默认 model。 */
const AI_MODEL_PREFIX = 'ai_model_';   // 用户为某个平台选定的模型，键名：ai_model_<平台键>
// 列表里夹杂语音/图像/向量等不能聊天的模型，先滤掉让选择项短一些
const AI_MODEL_NOISE = /audio|image|video|tts|asr|embedding|rerank|ocr|realtime|livetranslate|omni|translat/i;

// 取该平台实际要用的模型：优先用户选过的，否则配置里的默认值
function getProviderModel(provider) {
  const cfg = getProviderConfig(provider);
  try {
    const picked = localStorage.getItem(AI_MODEL_PREFIX + provider);
    if (picked && picked.trim()) return picked.trim();
  } catch (e) { /* 隐私模式读不到就用默认 */ }
  return cfg.model || '';
}

// 记住用户为某个平台选定的模型（空值＝清掉，回到默认）
function saveProviderModel(provider, model) {
  try {
    if (model) localStorage.setItem(AI_MODEL_PREFIX + provider, model);
    else localStorage.removeItem(AI_MODEL_PREFIX + provider);
  } catch (e) { /* 写不进去就算了 */ }
}

// 拉该平台的可用模型并让用户挑一个。没有 modelsUrl 的平台直接跳过（不去猜别人的接口）
async function discoverModels(provider) {
  const cfg = getProviderConfig(provider);
  if (!cfg.modelsUrl) return;                 // 这个平台没配列表接口：不打扰用户
  const key = getProviderKey(provider);
  if (!key) return;

  let list = [];
  try {
    const res = await fetch(cfg.modelsUrl, { headers: { 'Authorization': 'Bearer ' + key } });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      window.alert('查询 ' + cfg.name + ' 的模型列表失败（HTTP ' + res.status + '）：' +
        ((data && data.error && (data.error.message || data.error.code)) || 'Key 可能无效'));
      return;
    }
    const arr = (data && (data.data || data.models)) || [];
    list = arr.map(function (x) { return (x && (x.id || x.model || x.name)) || ''; }).filter(Boolean);
  } catch (e) {
    // 这里失败多半是模型列表接口没开跨域
    window.alert('查询 ' + cfg.name + ' 的模型列表失败：' + (e && e.message ? e.message : '网络错误'));
    return;
  }

  if (!list.length) { window.alert(cfg.name + ' 没有返回可用模型列表'); return; }

  const chatLike = list.filter(function (id) { return !AI_MODEL_NOISE.test(id); });
  const pool = chatLike.length ? chatLike : list;          // 全被过滤掉时就退回原始列表
  const show = pool.slice(0, 12);                          // prompt 里只列 12 个，避免弹窗长到看不完
  const current = getProviderModel(provider);
  const tip = '发现 ' + pool.length + ' 个可用模型（先列 ' + show.length + ' 个）：\n' +
    show.map(function (id, i) { return (i + 1) + ') ' + id; }).join('\n') +
    '\n\n注意：列表是官方返回的，但个别模型还需在控制台单独开通，调用报 not activated 时换一个即可。' +
    '\n输入序号或完整模型 ID 选用；直接回车沿用当前的 ' + current + '：';

  const ans = window.prompt(tip, '');
  if (ans === null) return;                    // 取消：模型保持原样
  const v = ans.trim();
  if (!v) return;                              // 直接回车：也保持原样

  let picked = v;
  const n = parseInt(v, 10);
  // 纯数字且落在展示范围内，就按序号取
  if (String(n) === v && n >= 1 && n <= show.length) picked = show[n - 1];
  saveProviderModel(provider, picked);
  window.alert('已选用模型：' + picked);
}

// 头部小圆点：只看“当前选中的平台”配没配 Key（绿=已配，灰=未配）
function refreshAiKeyDot() {
  const dot = document.getElementById('aiKeyDot');
  if (!dot) return;
  const provider = getProvider();
  const cfg = getProviderConfig(provider);
  const has = !!getProviderKey(provider);
  dot.style.background = has ? '#6BCB77' : '#ccc';
  dot.style.boxShadow = has ? '0 0 0 3px rgba(107,203,119,0.18)' : 'none';
  dot.title = (has ? '已配置 ' : '未配置 ') + cfg.name + ' 的 Key';
}

// 点击 ⚙️：为“当前平台”采集 Key。取消(返回 null) 或留空 → 什么都不做；保存成功 → 提示「保存成功」
function promptAiApiKey() {
  const provider = getProvider();
  const cfg = getProviderConfig(provider);
  // 平台名 + 前缀提示（豆包这类没有固定前缀就只说平台名）
  const hint = cfg.keyPrefix ? '（通常以 ' + cfg.keyPrefix + ' 开头）' : '';
  const input = window.prompt('请输入你的 ' + cfg.name + ' API Key' + hint + '：', getProviderKey(provider));
  if (input === null) return;      // 点了取消：原样保留，不动 localStorage
  const v = input.trim();
  if (!v) return;                  // 点了确定但没填内容：同样视为放弃
  saveProviderKey(provider, v);    // 只写当前平台的 keyStorage
  window.alert('保存成功');
  // 【本轮新增】输入 Key 后自动查这个平台能用哪些模型，让你现场挑一个
  discoverModels(provider);
}

/* ---------------- 真实请求 ---------------- */

/* 【本轮新增】读 SSE 流：把 reasoning_content 与 content 分别回调给 UI，最后返回拼好的正文
   兼容格式：每行 data: {json}，末尾 data: [DONE]；reasoning 与正文都是增量（delta） */
async function readAiStream(res, handlers) {
  handlers = handlers || {};
  const onReasoning = handlers.onReasoning || function () {};
  const onContent = handlers.onContent || function () {};

  // 极端情况下浏览器不支持 ReadableStream：退回一次性解析，保证还能出结果
  if (!res.body || !res.body.getReader) {
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }
    const c = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return c ? String(c).trim() : '';
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let content = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();                 // 最后一行可能是半截，留到下一轮再拼
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();       // 顺带处理 \r\n
        if (!line || line.indexOf('data:') !== 0) continue;   // 忽略空行、注释与 event: 行
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let obj = null;
        try { obj = JSON.parse(payload); } catch (e) { continue; }
        const delta = (obj.choices && obj.choices[0] && obj.choices[0].delta) || {};
        if (delta.reasoning_content) onReasoning(delta.reasoning_content);
        if (delta.content) { content += delta.content; onContent(delta.content); }
      }
    }
    // 流结束时 buffer 里可能还剩最后一行没处理
    const tail = buffer.trim();
    if (tail.indexOf('data:') === 0) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const obj = JSON.parse(payload);
          const delta = (obj.choices && obj.choices[0] && obj.choices[0].delta) || {};
          if (delta.reasoning_content) onReasoning(delta.reasoning_content);
          if (delta.content) { content += delta.content; onContent(delta.content); }
        } catch (e) { /* 收尾行解析失败就忽略 */ }
      }
    }
  } finally {
    try { reader.cancel(); } catch (e) { /* 已结束就忽略 */ }
  }
  return content.trim();
}

// 按当前选中的平台发请求。成功返回回复文本；失败抛出带 code 的 Error，交给 explainAiError 翻译
async function sendToAI(message, handlers) {
  handlers = handlers || {};
  // 1) 当前平台：下拉框的 value 就是 AI_PROVIDERS 的键
  const sel = document.getElementById('aiModelSelect');
  const selectedPlatform = (sel && sel.value) ? sel.value.trim() : DEFAULT_PROVIDER;
  const provider = getProviderConfig(selectedPlatform);

  // 1.5) 【本轮】智谱拦截：官方端点实测不返回 Access-Control-Allow-Origin，
  //     浏览器直连必被跨域拦死。这里直接拦下，不发注定失败的请求。
  if (selectedPlatform === 'zhipu') {
    showToast('智谱接口需在后端部署代理转发');
    const err = new Error('智谱接口需在后端部署代理转发');
    err.code = 'BLOCKED';
    err.silent = true;          // 已经用 Toast 提示过了，别再往对话里塞一条错误气泡
    throw err;
  }

  // 2) 平台没配置：直接说明，绝不拿别的平台顶上
  if (provider.unconfigured) {
    const err = new Error('「' + selectedPlatform + '」还没在 AI_PROVIDERS 里配置接口地址，先在 app.js 补一条再用');
    err.code = 'UNCONFIGURED';
    throw err;
  }

  // 3) 豆包的 model 还是“ep-你的接入点ID”占位，先拦住，别发一条注定失败的请求
  if (provider.placeholderModel) {
    const err = new Error('豆包还用不了：先去火山方舟控制台创建推理接入点，把 ep-xxx 填进 AI_PROVIDERS.doubao.model');
    err.code = 'UNCONFIGURED';
    err.provider = provider.name;
    throw err;
  }

  // 4) 读该平台自己的 Key（各平台互不共用）
  const apiKey = getProviderKey(selectedPlatform);
  if (!apiKey) {
    const err = new Error('请先点击右上角⚙️设置 ' + provider.name + ' 的 API Key');
    err.code = 'NO_KEY';
    throw err;
  }

  // 5) 目标地址：填了 proxyUrl 就走代理（智谱那条留给以后），否则直连官方端点
  const targetUrl = provider.proxyUrl || provider.url;

  const controller = new AbortController();
  // 开了深度思考的流式请求耗时长得多，给它 90 秒；普通请求仍 30 秒
  const timer = setTimeout(() => controller.abort(), provider.stream ? 90000 : 30000);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      signal: controller.signal,
      // 各平台都只认这一组头；OpenRouter 专用的 HTTP-Referer / X-Title 保持不发送
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.assign(
        {
          // 【本轮改造】模型不再写死：优先用「输入 Key 后自动查模型」里你选定的那个，没选过才用平台默认
          model: getProviderModel(selectedPlatform),
          messages: [{ role: 'user', content: message }]
        },
        provider.stream ? { stream: true } : {},   // 流式平台带上 stream，才能边想边显示
        provider.extraBody || {}                   // 平台专属参数（例如百炼的 enable_thinking）
      ))
    });

    // 出错时上游返回的是普通 JSON（不是流），先读文本再解析，直接 .json() 会二次抛出
    if (!res.ok) {
      const errRaw = await res.text();
      let data = null;
      try { data = JSON.parse(errRaw); } catch (e) { data = null; }
      const detail = (data && data.error && (data.error.message || data.error.code)) || errRaw.slice(0, 200) || ('HTTP ' + res.status);
      const err = new Error('请求失败（HTTP ' + res.status + '）：' + detail);
      err.code = 'HTTP_' + res.status;
      err.detail = detail;
      err.provider = provider.name;
      err.platform = selectedPlatform;
      err.upstreamCode = (data && data.error && data.error.code) || '';   // 方舟的上游错误码，比 HTTP 状态码更能指路
      throw err;
    }

    // 【本轮新增】流式平台：reasoning_content / content 边读边回调，正文由 UI 逐字渲染
    if (provider.stream) {
      const streamed = await readAiStream(res, handlers);
      if (!streamed) {
        const err = new Error('接口返回内容为空，模型没有给出正文。');
        err.code = 'EMPTY';
        err.provider = provider.name;
        throw err;
      }
      return streamed;
    }

    // 非流式平台：一次性解析
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { data = null; }

    const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) {
      const err = new Error('接口返回内容为空，模型没有给出 choices。');
      err.code = 'EMPTY';
      err.provider = provider.name;
      throw err;
    }
    return String(reply).trim();
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('请求超时（30 秒），请检查网络后重试');
      err.code = 'TIMEOUT';
      throw err;
    }
    if (e.code) throw e;      // 上面已包装好的错误，原样上抛
    // fetch 直接抛 TypeError 基本都是跨域被拦或断网（拿不到状态码）
    const err = new Error('网络请求失败：' + ((e && e.message) || '未知错误'));
    err.code = 'NETWORK';
    err.provider = provider.name;
    err.platform = selectedPlatform;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// 把技术性错误翻译成用户看得懂的一句话（带上平台名，方便定位是哪把 Key 的问题）
function explainAiError(e) {
  if (!e) return '⚠️ 请求失败，请稍后重试。';
  const code = e.code || '';
  const name = e.provider || '';
  if (code === 'NO_KEY' || code === 'UNCONFIGURED') return '⚠️ ' + e.message;   // 已是中文提示
  // 方舟特有的上游错误码，比 HTTP 状态码更能说明下一步该做什么
  if (e.upstreamCode === 'ModelNotOpen') {
    return '⚠️ ' + (name || '豆包') + ' 的模型还没开通（ModelNotOpen）：请到火山方舟控制台「开通管理」页开通该模型服务后再试。';
  }
  if (e.upstreamCode === 'InvalidEndpointOrModel.NotFound' || e.upstreamCode === 'InvalidEndpointOrModel.ModelIDAccessDisabled') {
    return '⚠️ ' + (name || '豆包') + ' 的 model 名不可用：请确认 AI_PROVIDERS.doubao.model 与控制台的 Model ID 完全一致，或改用它创建的推理接入点 ep-xxx。';
  }
  // 魔搭：Key 本身有效但没绑阿里云账号时，返回 401 + "Please bind your Alibaba Cloud account"
  if (e.detail && /bind your Alibaba Cloud account/i.test(e.detail)) {
    return '⚠️ 魔搭的 Key 有效，但账号还没绑定阿里云账号（Please bind your Alibaba Cloud account）。到 modelscope.cn 控制台完成阿里云账号绑定后即可调用。';
  }
  // 百炼：模型在列表里能查到，但所属产品没开通时会 400 InvalidParameter + not activated
  if (e.detail && /product is not activated|not activated/i.test(e.detail)) {
    return '⚠️ ' + (name || '当前平台') + ' 的这个模型还没开通（The product is not activated）：到控制台开通该模型，或点 ⚙️ 换回默认的 qwen3.8-flash。';
  }
  // Key 无效 / 额度不足：统一用这一句，用户看得懂下一步该干什么
  if (code === 'HTTP_401' || code === 'HTTP_402' || code === 'HTTP_403') {
    return '⚠️ ' + (name || '当前平台') + ' 请求失败，请检查 Key 是否有效或余额是否充足' +
           (e.detail ? '（' + e.detail + '）' : '');
  }
  if (code === 'HTTP_404') return '⚠️ ' + (name || '当前平台') + ' 返回 404：模型 ID / 接入点不对，检查 AI_PROVIDERS 里这个平台的 model，或点 ⚙️ 重新选一个模型。';
  if (code === 'HTTP_429') return '⚠️ ' + (name || '当前平台') + ' 请求太频繁，等十几秒再发。';
  if (code === 'HTTP_400') return '⚠️ ' + (name || '当前平台') + ' 拒绝了这次请求：' + (e.detail || '参数或模型 ID 有误。');
  if (code === 'TIMEOUT') return '⚠️ 请求超时，网络可能不通，稍后重试。';
  if (code === 'NETWORK') {
    // 智谱端点实测不返回 ACAO，浏览器直连必被 CORS 拦，这里点名说清可行解
    if (e.platform === 'zhipu') {
      return '⚠️ 智谱请求失败：浏览器被跨域(CORS)拦截。智谱官方端点不允许网页直连，需要把 AI_PROVIDERS.zhipu.proxyUrl 填成自己的转发代理地址后才能用。';
    }
    // 火山方舟的错误响应不带跨域头：Key 填错同样会表现成“跨域失败”，别让用户误判成网络问题
    if (e.platform === 'doubao') {
      return '⚠️ 豆包请求失败：可能是 Key 不对或不完整（方舟的 401 响应不带跨域头，浏览器只能报跨域失败）。请先用 ⚙️ 核对 Key 是否为 ark- 开头的完整值；Key 正确仍失败，就把 AI_PROVIDERS.doubao.proxyUrl 填成转发代理地址。';
    }
    return '⚠️ ' + (name || '当前平台') + ' 请求失败：可能是跨域限制或网络不通（' + (e.message || '') + '）。';
  }
  return '⚠️ ' + e.message;
}

// 发送主流程：用户气泡 → 清空输入 → 思考占位 → 真实请求（流式则逐字渲染）→ 收尾
async function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  appendAiMessage(text, 'user');     // 1) 先落用户气泡，内容不会因为请求失败而丢
  input.value = '';                  // 2) 清空输入框
  input.focus();

  const thinking = appendAiThinking();   // 3) 「AI 正在思考」占位
  let panel = null;                      // 流式气泡（含思考面板），收到第一段数据时才创建

  const ensurePanel = () => {
    if (!panel) {
      removeAiThinking(thinking);        // 真正开始输出后删掉占位
      panel = appendAiStream();
    }
    return panel;
  };

  try {
    const reply = await sendToAI(text, {
      // 思考过程：逐字追加到可折叠面板里
      onReasoning: (t) => {
        const p = ensurePanel();
        if (!p) return;
        p.thinkBody.textContent += t;
        scrollAiToBottom();
      },
      // 正文：第一次出现时把思考面板自动收起，然后逐字追加正文
      onContent: (t) => {
        const p = ensurePanel();
        if (!p) return;
        if (!p.replyStarted) {
          p.replyStarted = true;
          if (p.think) p.think.open = false;    // 自动收起
        }
        p.replyBody.textContent += t;
        scrollAiToBottom();
      }
    });

    if (!panel) {
      // 非流式平台：一次性落成气泡
      removeAiThinking(thinking);
      appendAiMessage(reply || '（模型没有返回内容）', 'ai');
      return;
    }

    // 流式结束：没产生思考内容就把空面板删掉，正文为空则给个提示
    if (panel.think && !panel.thinkBody.textContent.trim()) panel.think.remove();
    if (!panel.replyBody.textContent.trim()) panel.replyBody.textContent = '（模型没有返回正文）';
    scrollAiToBottom();
  } catch (e) {
    removeAiThinking(thinking);
    // 【本轮】被主动拦下的平台（如智谱）已经用 Toast 提示过，不再往对话里塞一条错误气泡
    if (e && e.silent) return;
    if (panel) {
      // 已经开始流式了：保住已显示的思考过程，把错误补在同一条气泡里
      const errLine = document.createElement('div');
      errLine.className = 'ai-reply';
      errLine.textContent = explainAiError(e);
      panel.row.appendChild(errLine);
      if (panel.think && !panel.thinkBody.textContent.trim()) panel.think.remove();
      scrollAiToBottom();
    } else {
      appendAiMessage(explainAiError(e), 'ai');   // 4) 失败也落在对话里，不弹框打断
    }
  }
}

/* ============================================
   【新增 C】事件绑定 + 与 index.html 内联旧脚本去重
   index.html 底部有一段内联 IIFE，给「游戏按钮 / AI 球 / 发送 / 回车」
   绑了上一轮的临时占位逻辑。两套逻辑同时收到一次点击会互相打架：
     · AI 一次发送追加两条用户消息
     · 悬浮球被开关两次，等于点了没反应
   这里在 document 的【捕获阶段】拦下这些事件并改用本文件的实现，
   内联旧实现不会再被执行。将来把那段内联脚本删掉，这段拦截依然正常。
   ============================================ */
// ========== 【分区 6】页面初始化入口（游戏面板 / AI / 事件拦截的初始化） ==========
document.addEventListener('DOMContentLoaded', () => {
  ensureGdBackBtn();

  // 【本轮】模型选择器：记住上次选中的平台；没有记录时回落到阿里云百炼（QWEN）
  const modelSel = document.getElementById('aiModelSelect');
  if (modelSel) {
    let savedPlatform = '';
    try { savedPlatform = localStorage.getItem('novarise_ai_model') || ''; } catch (e) { /* 隐私模式读不到就走默认 */ }
    // 记录里的平台已经不存在（比如被删掉的旧选项）时，同样回落 QWEN，不留一个空选择
    modelSel.value = (savedPlatform && AI_PROVIDERS[savedPlatform]) ? savedPlatform : 'dashscope';
    modelSel.addEventListener('change', () => {
      try { localStorage.setItem('novarise_ai_model', modelSel.value); } catch (e) {}
      refreshAiKeyDot();
    });
  }

  bindRightPanelToggle();   // 【Bug2 修复】游戏面板默认收起，🎮 球展开、面板 ✕ 收起

  refreshAiKeyDot();      // 按当前平台的 Key 校正状态灯（晚于 index.html 内联 IIFE 执行）

  // 点击类事件拦截
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest) return;

    const gameItem = t.closest('.rp-game');
    if (gameItem) { e.stopPropagation(); handleGameClick(gameItem); return; }

    if (t.closest('#aiChatBtn')) { e.stopPropagation(); toggleAiChat(); return; }
    if (t.closest('#aiChatSend')) { e.stopPropagation(); sendAiMessage(); return; }
    if (t.closest('#closeAiChat')) { e.stopPropagation(); closeAiChat(); return; }
    // ⚙️ 改为 prompt 采集 Key：拦在捕获阶段，index.html 里那个设置浮层不再弹出
    if (t.closest('#aiSettingsBtn')) { e.stopPropagation(); promptAiApiKey(); return; }
  }, true);

  // 输入框回车发送（Shift+Enter 不拦截）
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const t = e.target;
    if (t && t.id === 'aiChatInput') {
      e.stopPropagation();
      e.preventDefault();
      sendAiMessage();
    }
  }, true);

  // 【本轮】点击面板外部关闭 AI 聊天面板
  // 上面的点击拦截走的是捕获阶段 + stopPropagation，点球 / 点面板内部时事件根本走不到这里，
  // 所以这个监听只处理“点了别处”这一种情况，不会和开关逻辑打架。
  document.addEventListener('click', e => {
    const panel = document.getElementById('aiChatPanel');
    if (!panel) return;
    if (panel.style.display !== 'flex') return;      // 面板本来就收着，不用管

    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('#aiChatPanel')) return;            // 点在面板内部
    if (t.closest('#aiChatBtn')) return;              // 点悬浮球（由上面的拦截负责开关）
    if (t.closest('#aiSettingsBtn')) return;          // ⚙️ 交给 prompt 逻辑处理

    closeAiChat();
  });
});

