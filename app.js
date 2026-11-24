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

/*============================================================
     【分区 3｜新增】舞立方凭证绑定模块（dancecube）
     职责：Access-Token + UserID 的保存 / 解绑 / 状态渲染。
     存储 key：novarise_dc_token / novarise_dc_userid
     范式与水鱼模块完全一致：后端无状态，凭证只在本机浏览器与请求头里存在。
     跨模块协作：绑定成功后调用 window.__nvRefreshDancecube()（若正停在舞立方面板则立即刷新），
                 解绑后调用 window.__nvClearDancecube()（清空已加载数据并显示占位）。
     这两个钩子由下方「分区 4」定义，用户点击时早已就绪。
     ============================================================ */

(function () {
  'use strict';

  var DC_TOKEN_KEY = 'novarise_dc_token';
  var DC_USERID_KEY = 'novarise_dc_userid';

  /* ---------- 读写 ---------- */
  function readDcToken() {
    try {
      return {
        token: (localStorage.getItem(DC_TOKEN_KEY) || '').trim(),
        userId: (localStorage.getItem(DC_USERID_KEY) || '').trim()
      };
    } catch (e) {
      return { token: '', userId: '' };
    }
  }
  function saveDcToken(token, userId) {
    try {
      localStorage.setItem(DC_TOKEN_KEY, token);
      localStorage.setItem(DC_USERID_KEY, userId);
      return true;
    } catch (e) { return false; }
  }
  function clearDcToken() {
    try {
      localStorage.removeItem(DC_TOKEN_KEY);
      localStorage.removeItem(DC_USERID_KEY);
    } catch (e) { /* 隐私模式可能抛错，忽略 */ }
  }

  /* ---------- 状态渲染：两项都有 → 已绑态；否则 → 输入框 ---------- */
  function renderDcTokenUI() {
    var cred = readDcToken();
    var isBound = !!cred.token && !!cred.userId;
    var unbound = document.getElementById('dcTokenUnbound');
    var bound = document.getElementById('dcTokenBound');
    var tokenEl = document.getElementById('dcTokenInput');
    var userIdEl = document.getElementById('dcUserIdInput');

    if (unbound) unbound.classList.toggle('df-token-hidden', isBound);
    if (bound) bound.classList.toggle('df-token-hidden', !isBound);
    // 已绑定后不在页面里留明文
    if (isBound) {
      if (tokenEl) tokenEl.value = '';
      if (userIdEl) userIdEl.value = '';
    }
  }

  /* ---------- 提示：复用页面原有 showToast ---------- */
  function dcToast(msg) {
    if (typeof showToast === 'function') { showToast(msg); return; }

    var t = document.getElementById('dcFallbackToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'dcFallbackToast';
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
  function bindDcToken() {
    var tokenEl = document.getElementById('dcTokenInput');
    var userIdEl = document.getElementById('dcUserIdInput');
    var token = tokenEl && tokenEl.value ? tokenEl.value.trim() : '';
    var userId = userIdEl && userIdEl.value ? userIdEl.value.trim() : '';

    if (!token) { dcToast('Access-Token 不能为空'); return; }
    if (!userId) { dcToast('UserID 不能为空'); return; }
    if (!saveDcToken(token, userId)) { dcToast('本地存储不可用，请关闭隐私模式后重试'); return; }

    if (tokenEl) tokenEl.value = '';
    if (userIdEl) userIdEl.value = '';
    renderDcTokenUI();
    dcToast('绑定成功');

    // 自动刷新舞立方面板（仅在当前正停留在舞立方面板时生效）
    if (typeof window.__nvRefreshDancecube === 'function') window.__nvRefreshDancecube();
  }

  /* ---------- 解绑 ---------- */
  function unbindDcToken() {
    clearDcToken();
    renderDcTokenUI();
    dcToast('已解绑');

    // 清空面板里已加载的舞立方数据，改显示占位提示
    if (typeof window.__nvClearDancecube === 'function') window.__nvClearDancecube();
  }

  /* ---------- 入口 ---------- */
  function initDcToken() {
    var bindBtn = document.getElementById('bindDcBtn');
    var unbindBtn = document.getElementById('unbindDcBtn');
    var tokenEl = document.getElementById('dcTokenInput');
    var userIdEl = document.getElementById('dcUserIdInput');

    if (bindBtn) bindBtn.addEventListener('click', bindDcToken);
    if (unbindBtn) unbindBtn.addEventListener('click', unbindDcToken);

    [tokenEl, userIdEl].forEach(function (el) {
      if (!el) return;
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); bindDcToken(); }
      });
    });

    renderDcTokenUI();   // 页面初始化时按 localStorage 渲染绑定状态
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDcToken);
  } else {
    initDcToken();       // 本脚本在 body 末尾，此时 DOM 已就绪
  }
})();

// ============================================================
// 【分区导航｜JS】本次只做结构与新增，未重排任何原有代码（避免 IIFE 执行时机
// 与 const 声明时序被破坏）。各分区实际位置如下：
//   分区 1 全局工具函数   → 搜 "// ---------- 工具 ----------"
//   分区 2 全局状态与常量 → 搜 STORAGE_KEY / DATA_VERSION / API_BASE
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
// 【11.24】升为 2.4.11：本批新增 分类列表 / 按日便签 / 收藏分类 / 打卡日志 四个字段，
// 升级后旧存档会整体回写一次（migratedFrom 与新版本不等即触发），之后不再重复写存储
const DATA_VERSION = '2.4.11';
const TODO_TYPES = ['工作', '生活', '学习', '效率', '项目', '其他'];

/* ============================================
   【11.24 新增】分类体系常量
   - 待办：事务导向，原 4 类（工作/生活/学习/其他）保留，新增「效率」「项目」，共 6 类
   - 习惯：养成导向，与待办异化，默认 6 类
   - 两者都允许用户自定义增删改，上限 8 个（含默认），「其他」作兜底分类
   ============================================ */
const DEFAULT_TODO_CATS = TODO_TYPES;   // 与 TODO_TYPES 同源，保留旧常量名给历史代码用
const DEFAULT_HABIT_CATS = ['健康', '学习', '工作', '生活', '成长', '兴趣'];
const HABIT_OTHER = '其他';           // 习惯分类被删除时的迁移目标（不在默认 6 类内，按需自动补）
const CAT_MAX = 8;                    // 分类数量上限（含默认）
const QUOTE_CATS = ['通用', '原创', '网络流行', '影视台词', '名人名言', '书籍语录'];
const ALL_CAT = '全部';                // 筛选栏「全部」项

// 取当前可用的分类列表：优先用用户自定义后的存档，缺省回落默认
function todoCats() {
  return (data && Array.isArray(data.todoCats) && data.todoCats.length) ? data.todoCats : DEFAULT_TODO_CATS;
}
function habitCats() {
  return (data && Array.isArray(data.habitCats) && data.habitCats.length) ? data.habitCats : DEFAULT_HABIT_CATS;
}
// 分类清洗：去空、去重、截断到上限；forceOther=true 时保证兜底分类「其他」存在
function sanitizeCats(rawList, defaultList, forceOther) {
  let list = Array.isArray(rawList) ? rawList.filter(x => typeof x === 'string' && x.trim()) : [];
  list = list.map(x => x.trim()).filter((x, i, arr) => arr.indexOf(x) === i);
  if (list.length === 0) list = defaultList.slice();
  if (forceOther && !list.includes(HABIT_OTHER)) {
    if (list.length < CAT_MAX) list.push(HABIT_OTHER);
  }
  return list.slice(0, CAT_MAX);
}

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
    // 【11.24 新增】习惯卡分类筛选 + 查看日期（空 = 今天，非今天只读）
    checkinFilterCat: ALL_CAT,
    checkinViewDate: '',
    // 【11.24 新增】打卡日志：{ 'YYYY-MM-DD': { 习惯id: 次数 } }，供历史日期回看
    checkinLog: {},
    // 【11.24 新增】分类列表（可增删改，上限 8）
    todoCats: DEFAULT_TODO_CATS.slice(),
    habitCats: DEFAULT_HABIT_CATS.slice(),
    mood: {},
    // 【11.24 新增】customText：当前自定义句子；favFilter：我的收藏分类筛选
    quote: { currentIdx: 0, favorites: [], customText: '', favFilter: ALL_CAT },
    note: '',
    // 【11.24 新增】按日期保存的便签；noteDate 为空表示跟随今天
    notes: {},
    noteDate: '',
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

  // 【11.24 新增】分类列表迁移：必须排在 todos / checkins 的字段校验之前，
  // 否则用户自定义的分类会被当作非法值重置成「其他」，等于把人家建的分类删了。
  m.todoCats = sanitizeCats(raw.todoCats, DEFAULT_TODO_CATS, true);
  m.habitCats = sanitizeCats(raw.habitCats, DEFAULT_HABIT_CATS, false);

  // todos
  if (Array.isArray(m.todos)) {
    m.todos = m.todos.map(t => ({
      id: t.id !== undefined ? t.id : 't' + Date.now() + Math.random(),
      text: t.text || '',
      done: !!t.done,
      date: (t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date)) ? t.date : todayStr(),
      // 【11.24 改】校验基准由固定 4 类改为当前分类列表，自定义分类不会被重置
      type: (t.type && m.todoCats.includes(t.type)) ? t.type : '其他',
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
      // 【11.24 改】分类校验：存量数据缺分类或仍挂在旧默认「其他」上的，统一归入「生活」
      category: (typeof c.category === 'string' && m.habitCats.includes(c.category)) ? c.category : '生活',
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
        category: '生活', planDays: 0,
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
        category: '生活', planDays: 0,
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
  // 【11.24 新增】习惯卡筛选分类 / 查看日期兜底（日期非法时回落今天）
  m.checkinFilterCat = (typeof m.checkinFilterCat === 'string' && m.checkinFilterCat) ? m.checkinFilterCat : ALL_CAT;
  m.checkinViewDate = (typeof m.checkinViewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.checkinViewDate)) ? m.checkinViewDate : '';
  // 【11.24 新增】打卡日志兜底（旧数据没有这个字段，给空对象即可）
  if (!m.checkinLog || typeof m.checkinLog !== 'object' || Array.isArray(m.checkinLog)) m.checkinLog = {};
  delete m.habits; delete m.water;

  if (!m.mood || typeof m.mood !== 'object') m.mood = {};

  if (!m.quote || typeof m.quote !== 'object') m.quote = { currentIdx: 0, favorites: [], customText: '', favFilter: ALL_CAT };
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
  // 【11.24 新增】收藏项结构规范化：存量收藏没有分类字段，一律归「通用」，内容与日期原样保留
  m.quote.favorites = m.quote.favorites.map(f => ({
    text: (f && typeof f.text === 'string') ? f.text : '',
    date: (f && typeof f.date === 'string' && f.date) ? f.date : todayStr(),
    cat: (f && typeof f.cat === 'string' && QUOTE_CATS.includes(f.cat)) ? f.cat : '通用',
    src: (f && typeof f.src === 'string') ? f.src : '',
  })).filter(f => f.text);
  // 当前自定义句子 / 收藏筛选分类兜底
  if (typeof m.quote.customText !== 'string') m.quote.customText = '';
  if (typeof m.quote.favFilter !== 'string' || !m.quote.favFilter) m.quote.favFilter = ALL_CAT;

  // 【11.24 新增】便签改为按日期存储：旧版单一 note 迁到今天，内容与自动保存体验都不变
  if (!m.notes || typeof m.notes !== 'object' || Array.isArray(m.notes)) m.notes = {};
  if (typeof m.note !== 'string') m.note = '';
  if (m.note.trim() && typeof m.notes[todayStr()] !== 'string') m.notes[todayStr()] = m.note;
  m.noteDate = (typeof m.noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.noteDate)) ? m.noteDate : '';

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
  // 【11.24 新增】分类下拉跟随当前分类列表重建，分类增删改后无需手动刷新
  renderTodoCatOptions();
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
    // 【11.24 改】分组顺序跟随当前分类列表；列表外的历史类型排在最后，避免数据不显示
    const cats = todoCats();
    const order = cats.concat(Object.keys(byType).filter(type => !cats.includes(type)));
    const subs = order.filter(type => byType[type]).map(type =>
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
  const icons = { '工作':'💼','生活':'🏠','学习':'📖','效率':'⚡','项目':'🎯','其他':'📌' };
  // 【11.24 改】按当前分类列表遍历，新增的「效率」「项目」与自定义分类都会成组显示
  const cats = todoCats();
  const order = cats.concat(Object.keys(byType).filter(type => !cats.includes(type)));
  return order.filter(type => byType[type]).map(type => {
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
  // 【11.24 新增】筛选栏 / 日期提示 / 分类下拉跟随存档同步
  renderCheckinCatFilter();
  renderCheckinDateTip();
  renderHabitCatOptions();
  if (data.checkins.length === 0) {
    // 【修改点】文案更新：习惯与打卡已合并，引导使用"新建习惯"按钮
    c.innerHTML = '<div class="empty-state"><span class="emoji">✅</span>还没有习惯，点击下方「＋ 新建习惯」添加</div>';
    return;
  }
  const list = getVisibleCheckins();
  if (list.length === 0) {
    c.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span>该分类下还没有习惯</div>';
    return;
  }
  c.innerHTML = data.checkinViewMode === 'stack' ? renderCheckinStack(list) : renderCheckinList(list);
}
// 【11.24 新增】习惯卡当前查看的日期：空值 / 非法值一律按今天
function viewCheckinDate() {
  return (typeof data.checkinViewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.checkinViewDate))
    ? data.checkinViewDate : todayStr();
}
// 【11.24 新增】按分类筛选 + 按查看日期取次数的习惯清单
// 非今天：优先读打卡日志 checkinLog[日期][id]，没有日志则回落到 countDate 快照，
// 都没有就按 0 处理（不虚构历史数据）
function getVisibleCheckins() {
  const ds = viewCheckinDate();
  const isTodayView = ds === todayStr();
  const cat = data.checkinFilterCat || ALL_CAT;
  let list = data.checkins;
  if (cat !== ALL_CAT) list = list.filter(c => (c.category || '生活') === cat);
  const log = (data.checkinLog && typeof data.checkinLog[ds] === 'object') ? data.checkinLog[ds] : null;
  return list.map(c => {
    let count;
    if (isTodayView) count = c.count;
    else if (log && typeof log[c.id] === 'number') count = log[c.id];
    else if (c.countDate === ds) count = c.count;
    else count = 0;
    return { id: c.id, name: c.name, emoji: c.emoji, target: c.target, count, category: c.category, planDays: c.planDays };
  });
}
// 【11.24 新增】写一条打卡日志，供历史日期回看（只记录次数，不动原 count / countDate 逻辑）
function recordCheckinLog(id, ds, count) {
  if (!data.checkinLog || typeof data.checkinLog !== 'object' || Array.isArray(data.checkinLog)) data.checkinLog = {};
  if (!data.checkinLog[ds] || typeof data.checkinLog[ds] !== 'object') data.checkinLog[ds] = {};
  data.checkinLog[ds][id] = count;
}
function renderCheckinList(list) {
  // 【11.24 新增】查看非今天时降级为只读，避免把历史快照写进今天的 count
  const readonly = viewCheckinDate() !== todayStr();
  return list.map(item => {
    const pct = item.target ? Math.min(100, item.count/item.target*100) : 0;
    return `<div class="checkin-item">
      <div class="checkin-item-header">
        <span class="checkin-item-name">${item.emoji} ${escapeHtml(item.name)}<span class="cat-mini-tag">${escapeHtml(item.category || '生活')}</span></span>
        <span>
          <span class="checkin-item-count"${readonly?'':` data-target-edit="${item.id}" title="点击修改目标"`}>${item.count} / ${item.target}</span>
          ${readonly ? '' : `<button class="checkin-target-btn" data-target-edit="${item.id}" title="修改目标">改目标</button>`}
        </span>
      </div>
      <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
      <div class="checkin-controls">
        ${readonly
          ? '<span class="checkin-readonly-tip">历史记录只读</span>'
          : `<button class="btn" data-checkin-add="${item.id}">+1</button>
             <button class="btn btn-ghost" data-checkin-minus="${item.id}">-1</button>
             <button class="checkin-remove" data-checkin-del="${item.id}" title="删除">✕</button>`}
      </div>
    </div>`;
  }).join('');
}
function renderCheckinStack(list) {
  const readonly = viewCheckinDate() !== todayStr();
  const totalCount = list.reduce((s,i)=>s+i.count,0);
  const totalTarget = list.reduce((s,i)=>s+i.target,0);
  const pct = totalTarget ? Math.min(100, totalCount/totalTarget*100) : 0;
  const tags = list.map(item => {
    const done = item.count >= item.target;
    return `<span class="checkin-tag ${done?'done':''}"${readonly?'':` data-tag-id="${item.id}"`}>${item.emoji} ${escapeHtml(item.name)} ${item.count}/${item.target}</span>`;
  }).join('');
  return `<div class="water-summary">
      <div class="water-summary-count">${totalCount}</div>
      <div class="water-summary-target">${readonly ? '当日记录' : '今日目标'} ${totalTarget} 次</div>
    </div>
    <div class="water-bar"><div class="water-fill" style="width:${pct}%"></div></div>
    <div class="checkin-tags">${tags}</div>
    <div style="font-size:11px;color:var(--text-secondary);text-align:center;margin-top:6px">${readonly ? '历史记录只读' : '点击标签展开操作'}</div>`;
}
function checkinAdd(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item) return;
  const old = item.count;
  item.count++; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【11.24 新增】同步写入当天打卡日志，供「跳转至当日」回看历史
  recordCheckinLog(item.id, todayStr(), item.count);
  // 【修改点】实时刷新：打卡变化同步更新日历圆点
  saveData(); renderTodos(); renderCheckins(); renderMoodCalendar(); renderJourney();
}
function checkinMinus(id) {
  const item = data.checkins.find(x => String(x.id) === String(id));
  if (!item || item.count <= 0) return;
  const old = item.count;
  item.count--; item.countDate = todayStr();
  checkStreakOnCount(item, old, item.count);
  // 【11.24 新增】同步写入当天打卡日志
  recordCheckinLog(item.id, todayStr(), item.count);
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
  // 【11.24 改】默认分类改为「当前习惯分类列表的第一项」，避免「健康」被删后选到空值
  if (category) { const cats = habitCats(); category.value = cats.includes('健康') ? '健康' : cats[0]; }
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

  // 【11.24 改】分类以当前习惯分类列表为准，选到无效值时回落到第一项
  const hCats = habitCats();
  const chosenCat = document.getElementById('hfCategory').value;
  const category = hCats.includes(chosenCat) ? chosenCat : (hCats[0] || '生活');

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
  mdCurrentDate = ds;   // 【11.24 新增】记住弹窗对应日期，供「跳转至当日」使用
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
   【11.24 新增】模块一：心情详情弹窗 → 跳转至当日
   点一下按钮，待办 / 习惯 / 心情日历 / 快捷便签 四处同步切到弹窗对应的那一天
   ============================================ */
let mdCurrentDate = '';   // 当前弹窗对应的日期，由 openMoodDetail 写入

function jumpToDate(ds) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds || '')) return;
  closeMoodDetail();
  const isToday = ds === todayStr();

  // 1) 待办：先清掉搜索词（否则搜索视图会盖住日期），再把筛选年月日与截止日期都切到目标日
  data.todoSearch = '';
  const se = document.getElementById('todoSearch'); if (se) se.value = '';
  const [y, m, d] = ds.split('-');
  const yEl = document.getElementById('filterYear');
  const mEl = document.getElementById('filterMonth');
  const dEl = document.getElementById('filterDay');
  if (yEl) yEl.value = y;
  if (mEl) mEl.value = m;
  if (dEl) dEl.value = d;
  const todoDateEl = document.getElementById('todoDate'); if (todoDateEl) todoDateEl.value = ds;
  renderTodos();

  // 2) 习惯与打卡：切到目标日（非今天自动降级为只读）
  data.checkinViewDate = isToday ? '' : ds;
  renderCheckins();

  // 3) 心情日历：翻到该月并高亮选中
  selectedMoodDate = ds;
  const dt = parseDate(ds);
  calYear = dt.getFullYear(); calMonth = dt.getMonth();
  renderMoodCalendar();

  // 4) 快捷便签：切到当天那一格内容
  data.noteDate = isToday ? '' : ds;
  renderNote();

  saveData();
  const card = document.getElementById('card-todo');
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('已切换到 ' + (isToday ? '今天' : formatDateCN(ds)));
}

/* ============================================
   【11.24 新增】模块三：分类体系（待办事务导向 / 习惯养成导向）
   两套分类互相独立，共用同一个管理弹窗，上限 CAT_MAX 个
   ============================================ */
let cmTarget = 'todo';   // 管理弹窗当前操作对象：'todo' | 'habit'

// 待办分类下拉：按当前分类列表重建 option，保留用户已选中的值
function renderTodoCatOptions() {
  const sel = document.getElementById('todoTypeSelect');
  if (!sel) return;
  const prev = sel.value;
  const cats = todoCats();
  const sig = cats.join('|');
  if (sel.dataset.cats !== sig) {
    sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    sel.dataset.cats = sig;
  }
  sel.value = cats.includes(prev) ? prev : (cats.includes('其他') ? '其他' : cats[0]);
}
// 新建习惯弹窗的分类下拉：同上，跟随习惯分类列表
function renderHabitCatOptions() {
  const sel = document.getElementById('hfCategory');
  if (!sel) return;
  const prev = sel.value;
  const cats = habitCats();
  const sig = cats.join('|');
  if (sel.dataset.cats !== sig) {
    sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    sel.dataset.cats = sig;
  }
  sel.value = cats.includes(prev) ? prev : cats[0];
}
// 习惯卡顶部的分类筛选栏（「全部」+ 各分类 + 管理按钮）
function renderCheckinCatFilter() {
  const bar = document.getElementById('checkinCatFilter');
  if (!bar) return;
  const cats = habitCats();
  const cur = (data.checkinFilterCat === ALL_CAT || cats.includes(data.checkinFilterCat))
    ? data.checkinFilterCat : ALL_CAT;
  data.checkinFilterCat = cur;
  const btn = bar.querySelector('.cat-manage-btn');   // 先取到引用，重建后再挂回去
  bar.innerHTML = [ALL_CAT].concat(cats).map(c =>
    `<span class="cat-chip${c === cur ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</span>`
  ).join('');
  if (btn) bar.appendChild(btn);
}
// 习惯卡顶部「正在查看某日」提示：仅非今天时出现
function renderCheckinDateTip() {
  const tip = document.getElementById('checkinDateTip');
  const label = document.getElementById('checkinDateLabel');
  const ds = viewCheckinDate();
  const isToday = ds === todayStr();
  if (tip) tip.style.display = isToday ? 'none' : 'block';
  if (label) label.textContent = isToday ? '今天' : formatDateCN(ds);
}

function catList(kind) { return kind === 'habit' ? habitCats() : todoCats(); }
function catSave(kind, list) { if (kind === 'habit') data.habitCats = list; else data.todoCats = list; }

function openCatManage(kind) {
  cmTarget = kind === 'habit' ? 'habit' : 'todo';
  const mask = document.getElementById('catManageMask');
  const title = document.getElementById('cmTitle');
  const input = document.getElementById('cmInput');
  if (title) title.textContent = cmTarget === 'habit' ? '管理习惯分类' : '管理待办分类';
  if (input) input.value = '';
  renderCatManageList();
  if (mask) mask.style.display = 'flex';
}
function closeCatManage() {
  const mask = document.getElementById('catManageMask');
  if (mask) mask.style.display = 'none';
}
function renderCatManageList() {
  const box = document.getElementById('cmList');
  if (!box) return;
  const list = catList(cmTarget);
  // 「其他」是删除分类时的迁移兜底（待办默认就有，习惯在删分类时按需补出），
  // 一旦被改名/删除，迁移目标就不存在了，所以只要列表里有「其他」就锁住它的改和删
  const protect = list.includes('其他') ? '其他' : '';
  box.innerHTML = list.map((c, i) => `
    <div class="cm-row">
      <span class="cm-name">${escapeHtml(c)}${c === protect ? '<span class="cm-lock">兜底</span>' : ''}</span>
      <span class="cm-ops">
        <button class="btn btn-ghost btn-sm" data-cm-rename="${i}"${c === protect ? ' disabled' : ''}>重命名</button>
        <button class="btn btn-ghost btn-sm" data-cm-del="${i}"${c === protect ? ' disabled' : ''}>删除</button>
      </span>
    </div>`).join('');
  const tip = document.getElementById('cmTip');
  if (tip) tip.textContent = `当前 ${list.length} / ${CAT_MAX} 个分类（含默认）；删除分类后，其下条目会自动迁移到「其他」。`;
}
// 分类改动后统一刷新：两个下拉 + 待办列表 + 习惯筛选与列表
function refreshCatUI() {
  renderTodoCatOptions();
  renderHabitCatOptions();
  renderCheckinCatFilter();
  renderTodos();
  renderCheckins();
  updateCardOverviews();
}
function addCategory(rawName) {
  const n = (rawName || '').trim();
  const list = catList(cmTarget);
  if (!n) { showToast('请输入分类名称'); return; }
  if (n.length > 6) { showToast('分类名称最多 6 个字'); return; }
  if (list.includes(n)) { showToast('该分类已存在'); return; }
  if (list.length >= CAT_MAX) { showToast(`分类已达上限 ${CAT_MAX} 个`); return; }
  catSave(cmTarget, list.concat(n));
  saveData(); renderCatManageList(); refreshCatUI();
  const input = document.getElementById('cmInput'); if (input) input.value = '';
  showToast('已新增分类「' + n + '」');
}
function renameCategory(i) {
  const list = catList(cmTarget);
  const oldName = list[i];
  if (oldName === undefined) return;
  if (oldName === '其他') { showToast('「其他」是兜底分类，不能重命名'); return; }
  const input = prompt(`把「${oldName}」改成：`, oldName);
  if (input === null) return;
  const n = input.trim();
  if (!n) { showToast('名称不能为空'); return; }
  if (n.length > 6) { showToast('分类名称最多 6 个字'); return; }
  if (n === oldName) return;
  if (list.includes(n)) { showToast('该分类已存在'); return; }
  const next = list.slice(); next[i] = n;
  catSave(cmTarget, next);
  // 同步改写该分类下所有条目的归属，避免出现「分类改名、条目还挂在旧名」的孤儿数据
  if (cmTarget === 'todo') data.todos.forEach(t => { if (t.type === oldName) t.type = n; });
  else {
    data.checkins.forEach(c => { if (c.category === oldName) c.category = n; });
    if (data.checkinFilterCat === oldName) data.checkinFilterCat = n;
  }
  saveData(); renderCatManageList(); refreshCatUI();
  showToast('已重命名为「' + n + '」');
}
function deleteCategory(i) {
  const list = catList(cmTarget);
  const name = list[i];
  if (name === undefined) return;
  if (cmTarget === 'todo' && name === '其他') { showToast('「其他」是兜底分类，不能删除'); return; }
  if (!confirm(`确定删除分类「${name}」吗？\n该分类下的条目会迁移到「其他」。`)) return;
  const next = list.slice(); next.splice(i, 1);
  // 习惯默认 6 类里没有「其他」，删除时按需补一个作为迁移目标（补完仍在 8 个上限内）
  const target = '其他';
  if (!next.includes(target)) {
    if (next.length >= CAT_MAX) { showToast('分类已达上限，无法创建兜底分类「其他」'); return; }
    next.push(target);
  }
  catSave(cmTarget, next);
  if (cmTarget === 'todo') data.todos.forEach(t => { if (t.type === name) t.type = target; });
  else {
    data.checkins.forEach(c => { if (c.category === name) c.category = target; });
    if (data.checkinFilterCat === name) data.checkinFilterCat = ALL_CAT;
  }
  saveData(); renderCatManageList(); refreshCatUI();
  showToast(`已删除「${name}」，相关条目已迁移到「${target}」`);
}

/* ============================================
   每日一句
   ============================================ */
// 【11.24 新增】当前展示的句子：有自定义句子就优先展示它，否则取内置语录
function currentQuoteText() {
  const custom = (data.quote.customText || '').trim();
  return custom || (QUOTES[data.quote.currentIdx] || '');
}
function renderQuote() {
  const textEl = document.getElementById('quoteText');
  if (textEl) textEl.textContent = currentQuoteText();

  // 输入框回填：用户正在输入（聚焦）时不要抢光标
  const input = document.getElementById('quoteCustomInput');
  if (input && document.activeElement !== input && input.value !== (data.quote.customText || '')) {
    input.value = data.quote.customText || '';
  }

  // 【11.24 新增】我的收藏分类筛选栏
  const bar = document.getElementById('favFilterBar');
  if (bar) {
    const cur = data.quote.favFilter || ALL_CAT;
    bar.innerHTML = [ALL_CAT].concat(QUOTE_CATS).map(c =>
      `<span class="cat-chip${c === cur ? ' active' : ''}" data-favcat="${escapeHtml(c)}">${escapeHtml(c)}</span>`
    ).join('');
  }

  const list = document.getElementById('favoritesList');
  const items = document.getElementById('favoritesItems');
  if (!list || !items) return;
  const favs = data.quote.favorites || [];
  if (favs.length === 0) { list.style.display = 'none'; return; }
  list.style.display = 'block';
  const filter = data.quote.favFilter || ALL_CAT;
  const shown = filter === ALL_CAT ? favs : favs.filter(f => (f.cat || '通用') === filter);
  if (shown.length === 0) {
    items.innerHTML = `<div style="padding:10px 0;font-size:12px;color:var(--text-secondary);">「${escapeHtml(filter)}」分类下还没有句子</div>`;
    return;
  }
  // 删除按钮带的是原数组下标，筛选状态下也不会删错条目
  items.innerHTML = shown.map(f => {
    const idx = favs.indexOf(f);
    return `<div class="favorite-item">
      <span class="favorite-text">"${escapeHtml(f.text)}"${f.src ? `<span class="favorite-src">—— ${escapeHtml(f.src)}</span>` : ''}</span>
      <span style="text-align:right;flex-shrink:0;">
        <span class="fav-cat-tag">${escapeHtml(f.cat || '通用')}</span>
        <div class="favorite-date">${escapeHtml(f.date)}</div>
        <button class="favorite-del" data-fav-del="${idx}">✕</button>
      </span>
    </div>`;
  }).join('');
}
function nextQuote() {
  // 【11.24 改】换一句时先退出自定义句子，回到内置语录轮换（原有轮换逻辑不变）
  data.quote.customText = '';
  data.quote.currentIdx = (data.quote.currentIdx + 1) % QUOTES.length;
  saveData(); renderQuote();
}
// 【11.24 改】收藏前先弹分类选择；已收藏过仍按原逻辑提示
function favoriteCurrentQuote() {
  const text = currentQuoteText();
  if (!text.trim()) { showToast('先写点什么，或者点「换一句」'); return; }
  if (data.quote.favorites.some(f => f.text === text)) { showToast('已经收藏过了'); return; }
  openQuoteFav(text);
}
function deleteFavorite(idx) {
  data.quote.favorites.splice(idx, 1);
  saveData(); renderQuote();
}

/* ============================================
   【11.24 新增】收藏分类选择弹窗 / 句子库搜索弹窗
   ============================================ */
let qfPending = '';        // 待收藏的句子原文
let qfCat = '通用';        // 弹窗里选中的分类

function openQuoteFav(text) {
  const mask = document.getElementById('quoteFavMask');
  if (!mask) return;
  qfPending = text;
  qfCat = '通用';
  const pv = document.getElementById('qfPreview'); if (pv) pv.textContent = '"' + text + '"';
  const src = document.getElementById('qfSource'); if (src) src.value = '';
  renderQfCats();
  mask.style.display = 'flex';
}
function closeQuoteFav() {
  const mask = document.getElementById('quoteFavMask');
  if (mask) mask.style.display = 'none';
}
function renderQfCats() {
  const box = document.getElementById('qfCats');
  if (!box) return;
  box.innerHTML = QUOTE_CATS.map(c =>
    `<span class="cat-chip${c === qfCat ? ' active' : ''}" data-qfcat="${escapeHtml(c)}">${escapeHtml(c)}</span>`
  ).join('');
}
function confirmQuoteFav() {
  const text = (qfPending || '').trim();
  if (!text) { closeQuoteFav(); return; }
  if (data.quote.favorites.some(f => f.text === text)) { showToast('已经收藏过了'); closeQuoteFav(); return; }
  const srcEl = document.getElementById('qfSource');
  data.quote.favorites.unshift({
    text, date: todayStr(), cat: qfCat || '通用', src: srcEl ? srcEl.value.trim() : '',
  });
  saveData(); closeQuoteFav(); renderQuote();
  showToast('已收藏到「' + (qfCat || '通用') + '」');
}

function openQuoteSearch() {
  const mask = document.getElementById('quoteSearchMask');
  if (!mask) return;
  const input = document.getElementById('qsInput'); if (input) input.value = '';
  renderQuoteSearchResults('');
  mask.style.display = 'flex';
  setTimeout(() => { if (input) input.focus(); }, 60);
}
function closeQuoteSearch() {
  const mask = document.getElementById('quoteSearchMask');
  if (mask) mask.style.display = 'none';
}
// 搜索范围 = 本地收藏的句子库，按内容 / 出处 / 分类模糊匹配
function renderQuoteSearchResults(q) {
  const box = document.getElementById('qsResults');
  if (!box) return;
  const kw = (q || '').trim().toLowerCase();
  const favs = data.quote.favorites || [];
  const hits = kw
    ? favs.filter(f => (f.text || '').toLowerCase().includes(kw)
        || (f.src || '').toLowerCase().includes(kw)
        || (f.cat || '通用').toLowerCase().includes(kw))
    : favs;
  if (hits.length === 0) {
    box.innerHTML = `<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--text-secondary);">${kw ? '没搜到匹配的句子' : '句子库还是空的，先收藏几句吧'}</div>`;
    return;
  }
  box.innerHTML = hits.map(f => {
    const idx = favs.indexOf(f);
    return `<div class="qs-item" data-qs-pick="${idx}">
      <div class="qs-text">"${escapeHtml(f.text)}"</div>
      <div class="qs-meta">
        <span class="fav-cat-tag">${escapeHtml(f.cat || '通用')}</span>
        ${f.src ? `<span class="qs-src">${escapeHtml(f.src)}</span>` : ''}
        <span class="favorite-date">${escapeHtml(f.date)}</span>
      </div>
    </div>`;
  }).join('');
}
function pickSearchResult(idx) {
  const f = (data.quote.favorites || [])[idx];
  if (!f) return;
  // 设成当前每日一句：写进 customText，不动内置语录的轮换指针
  data.quote.customText = f.text;
  saveData(); closeQuoteSearch(); renderQuote();
  showToast('已设为今日一句');
}

/* ============================================
   便签
   【11.24 改】改为按日期存档：noteDate 为空时跟随今天，
   日常使用仍是「打开就是今天那张」，切换日期时才看历史那一格
   ============================================ */
function noteKey() {
  return (typeof data.noteDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.noteDate)) ? data.noteDate : todayStr();
}
function getNoteText(ds) {
  if (!data.notes || typeof data.notes !== 'object') data.notes = {};
  if (typeof data.notes[ds] === 'string') return data.notes[ds];
  // 兼容旧版只有单一 note 的数据：仅在「今天」这一格回落到 data.note
  if (ds === todayStr() && typeof data.note === 'string') return data.note;
  return '';
}
function renderNote() {
  const ds = noteKey();
  const area = document.getElementById('noteArea');
  if (area) area.value = getNoteText(ds);
  const label = document.getElementById('noteDateLabel');
  if (label) label.textContent = '· ' + (ds === todayStr() ? '今天' : formatDateCN(ds));
}
function saveNote() {
  const ds = noteKey();
  const val = document.getElementById('noteArea').value;
  if (!data.notes || typeof data.notes !== 'object') data.notes = {};
  data.notes[ds] = val;
  // 今天这格同步写回旧字段 data.note，导出的备份里依旧能看到当天内容
  if (ds === todayStr()) data.note = val;
  saveData();
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
  // 【11.24 新增】时间机器里的编辑也记进打卡日志，与主面板历史回看保持一致
  recordCheckinLog(item.id, date, item.count);
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
  // 【11.24 新增】时间机器里的编辑也记进打卡日志
  recordCheckinLog(item.id, date, item.count);
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
  // 【修改点】待办截止日期框初始值设为今天。
  // 不给初值的话页面一打开该框是空的，addTodo() 虽然会兜底回退到今天，
  // 但用户看不到实际日期，也不知道这条待办会落在哪一天。
  const todoDateEl = document.getElementById('todoDate');
  if (todoDateEl) todoDateEl.value = todayStr();
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
  // 【11.24 新增】弹窗底部「跳转至当日」
  safeBind('mdJumpBtn', 'click', () => jumpToDate(mdCurrentDate));

  // 每日一句
  document.getElementById('newQuoteBtn').addEventListener('click', nextQuote);
  document.getElementById('favoriteQuoteBtn').addEventListener('click', favoriteCurrentQuote);
  document.getElementById('favoritesItems').addEventListener('click', e => {
    const del = e.target.closest('[data-fav-del]'); if (del) deleteFavorite(Number(del.dataset.favDel));
  });

  // 【11.24 新增】每日一句操作栏：自定义输入实时同步展示区
  const quoteInput = document.getElementById('quoteCustomInput');
  if (quoteInput) {
    quoteInput.addEventListener('input', () => {
      data.quote.customText = quoteInput.value;
      const t = document.getElementById('quoteText');
      if (t) t.textContent = quoteInput.value.trim() || (QUOTES[data.quote.currentIdx] || '');
    });
    // 失焦时落盘并回填输入框（避免每个按键都写 localStorage）
    quoteInput.addEventListener('change', () => { saveData(); renderQuote(); });
  }
  // 搜索句子库
  safeBind('quoteSearchBtn', 'click', openQuoteSearch);
  safeBind('qsClose', 'click', closeQuoteSearch);
  safeBind('quoteSearchMask', 'click', e => { if (e.target === e.currentTarget) closeQuoteSearch(); });
  safeBind('qsInput', 'input', e => renderQuoteSearchResults(e.target.value));
  safeBind('qsResults', 'click', e => {
    const item = e.target.closest('[data-qs-pick]'); if (!item) return;
    pickSearchResult(Number(item.dataset.qsPick));
  });
  // 收藏分类选择
  safeBind('qfClose', 'click', closeQuoteFav);
  safeBind('qfCancel', 'click', closeQuoteFav);
  safeBind('quoteFavMask', 'click', e => { if (e.target === e.currentTarget) closeQuoteFav(); });
  safeBind('qfCats', 'click', e => {
    const chip = e.target.closest('[data-qfcat]'); if (!chip) return;
    qfCat = chip.dataset.qfcat; renderQfCats();
  });
  safeBind('qfConfirm', 'click', confirmQuoteFav);
  // 我的收藏分类筛选
  safeBind('favFilterBar', 'click', e => {
    const chip = e.target.closest('[data-favcat]'); if (!chip) return;
    data.quote.favFilter = chip.dataset.favcat; saveData(); renderQuote();
  });
  // 习惯分类筛选
  safeBind('checkinCatFilter', 'click', e => {
    const chip = e.target.closest('[data-cat]'); if (!chip) return;
    data.checkinFilterCat = chip.dataset.cat; saveData();
    renderCheckins(); updateCardOverviews();
  });
  // 分类管理弹窗（待办 / 习惯共用）
  safeBind('checkinBackTodayBtn', 'click', () => jumpToDate(todayStr()));
  safeBind('todoCatManageBtn', 'click', () => openCatManage('todo'));
  safeBind('habitCatManageBtn', 'click', () => openCatManage('habit'));
  safeBind('cmClose', 'click', closeCatManage);
  safeBind('catManageMask', 'click', e => { if (e.target === e.currentTarget) closeCatManage(); });
  safeBind('cmAdd', 'click', () => addCategory(document.getElementById('cmInput').value));
  safeBind('cmInput', 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(e.target.value); } });
  safeBind('cmList', 'click', e => {
    const rn = e.target.closest('[data-cm-rename]'); if (rn) { renameCategory(Number(rn.dataset.cmRename)); return; }
    const dl = e.target.closest('[data-cm-del]'); if (dl && !dl.disabled) { deleteCategory(Number(dl.dataset.cmDel)); return; }
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

  // 【修改点】AI 输入框高度自适应
  // 说明：现在 index.html 里的 #aiChatInput 还是单行 <input type="text">，
  // 对单行 input 设 height = scrollHeight 会把输入框撑高、外观走形，
  // 所以只在控件确实换成 <textarea> 时才接管，当前版本零副作用。
  const aiInputEl = document.getElementById('aiChatInput');
  if (aiInputEl) {
    aiInputEl.addEventListener('input', function () {
      if (this.tagName !== 'TEXTAREA') return;
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }
}

// ========== 【分区 6】页面初始化入口（主业务启动：读数据 → 包裹卡片 → 绑事件 → 首渲染） ==========
// ---------- 启动 ----------
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  // 【11.24】习惯区的「历史日期视图」只在本次跳转内临时生效：刷新/重开页面一律回到今天，
  // 否则一进来就是一堆只读的旧习惯，容易让人以为打卡坏了
  data.checkinViewDate = '';
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

    // ========== 【11.23 新增】点击空白自动收起面板 ==========
    // 以上 5 条核心绑定全部原样保留；以下代码只在“未命中任何一条分支”、即点了空白处时才执行
    const target = e.target;
    if (!target || !target.closest) return;

    // 1. AI 聊天面板：展开状态下，点击面板外区域自动收起
    const aiPanel = document.getElementById('aiChatPanel');
    if (aiPanel && aiPanel.style.display === 'flex') {
      if (!target.closest('#aiChatPanel') && !target.closest('#aiChatBtn') && !target.closest('#aiSettingsBtn')) {
        if (typeof closeAiChat === 'function') closeAiChat();
      }
    }

    // 2. 右侧游戏菜单：展开状态下，点击面板外区域自动收起
    const rightPanel = document.getElementById('rightPanel');
    const rpOpenBtn = document.getElementById('rpOpenBtn');
    if (rightPanel && rightPanel.style.display !== 'none') {
      if (!target.closest('#rightPanel') && !target.closest('#rpOpenBtn')) {
        rightPanel.style.display = 'none';
        if (rpOpenBtn) rpOpenBtn.style.display = 'flex';
      }
    }

    // 3. 设置面板：点击遮罩层自动关闭
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay && settingsOverlay.classList.contains('open')) {
      if (target === settingsOverlay && typeof closeSettings === 'function') {
        closeSettings();
      }
    }
  }, true);

  // 输入框回车逻辑：电脑端发送，手机端不发送
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (!t || t.id !== 'aiChatInput') return;
    if (e.key !== 'Enter' || e.shiftKey) return;

    const isMobile = window.innerWidth < 768;

    // 手机端：Enter 不发送。这里依然要 stopPropagation —— 否则事件会继续落到
    // 分区 5 的旧聊天逻辑上，触发 sendMessage() 往面板里塞一条
    // “（AI 服务尚未接入…）” 的假回复。
    if (isMobile) { e.stopPropagation(); return; }

    // 电脑端：Enter 发送（Shift+Enter 不拦截，留给换行）
    e.stopPropagation();
    e.preventDefault();
    sendAiMessage();
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
