8080
/* ============================================
   【新增 A】多游戏数据面板
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

// 智能判断环境：本地运行走 8080，线上走魔搭网关
// 末尾不带 /、不带 /api，保持与 API_BASE + '/api/get_game_data?game=…' 的拼接规范
const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:')
  ? 'http://127.0.0.1:8080'
  : 'https://si00008-novarise-api.ms.show';

// 游戏 ID → 显示名（菜单与面板共用；接口没返回 label 时用它兜底）
const GD_GAME_LABELS = {
  maimai: '舞萌 DX',
  dancecube: '舞立方',
  lol: '英雄联盟',
  lolm: '英雄联盟手游',
  hok: '王者荣耀',        // 已从右侧菜单移除，映射保留：接口调试时仍能给出正确中文名，不影响现有逻辑
  valorant: '瓦罗兰特',   // 同上，已从菜单移除
};

/* ---------- 【预留】LOL / LOLM 接口接入位（纯注释，本次不实现） ----------
两者当前都走通用链路：fetchRealGameData(gameId) → 后端 /api/get_game_data → 失败时 renderGdError。
后端现状（main.py 的 ALL_GAMES = REAL_GAMES + ["lol", "hok", "valorant"]）：
· lol   → 501「该游戏暂未接入真实数据源」
· lolm  → 404「未知游戏：lolm」（ALL_GAMES 尚未包含），前端同样落到 renderGdError，不会崩
后续接入时前端零改动，只需后端把 lolm 补进 ALL_GAMES 并补数据源，返回体保持 6 字段：
{ label, player:{name,sub,level,rank,avatar}, stats:[{label,value}],
  matches:[{main,sub}], highlights:[{text,color:blue|green|amber}], tip }
-------------------------------------------------------------------------- */

// 请求序号：连点不同游戏时只认最后一次点击的结果，避免先发的慢响应覆盖后发的新数据
let gdRequestSeq = 0;

/* ---------- 【本轮改造】真实接口请求 ---------- */

/**
 * 拉取某个游戏的真实数据
 * @param {string} gameId maimai / dancecube / lol / lolm
 * @param {number} timeoutMs 超时毫秒数（魔搭冷启动慢，给足 45 秒）
 * @returns {Promise<object>} 结构：{label, player, stats, matches, highlights, tip}
 */
async function fetchRealGameData(gameId, timeoutMs) {
  let url = API_BASE + '/api/get_game_data?game=' + encodeURIComponent(gameId);
  const limit = timeoutMs || 45000;

  /* ---------- maimai 专用：透传水鱼 Token ----------
     后端 FastAPI 无状态，读取 X-Mx-ReqToken 头（Authorization 会被魔搭网关拦截）。
     其他游戏（dancecube / lol / lolm）走下面的原逻辑。 */
  const extraHeaders = {};
  if (gameId === 'maimai') {
    const token = readDfToken();
    if (!token) {
      // 没有 Token 就不发网络请求，交给 showGameDashboard 渲染占位 + Toast
      const noTokenErr = new Error('未绑定Token，无法获取成绩');
      noTokenErr.code = 'NO_DF_TOKEN';
      throw noTokenErr;
    }
    // 凭证走 X-Mx-ReqToken：魔搭网关会拦截任何带 Authorization 的请求（直接 403），
    //   而 X-Mx-ReqToken 在其允许头名单内，可正常穿透。
    extraHeaders['X-Mx-ReqToken'] = token;
  }

  /* ---------- dancecube 专用：透传舞立方凭证 ----------
     后端 dancecube 分支认 X-Mx-ReqToken + ?userId= 两项（Authorization 会被魔搭网关 403），
     缺任一项后端直接 401，所以这里先本地校验，不发无意义的请求。 */
  if (gameId === 'dancecube') {
    const dc = readDcToken();
    if (!dc.token || !dc.userId) {
      const noDcErr = new Error('未绑定舞立方凭证，无法获取成绩');
      noDcErr.code = 'NO_DC_TOKEN';
      throw noDcErr;
    }
    // token 走 X-Mx-ReqToken（Authorization 会被魔搭网关 403），userId 走 query 参数。
    extraHeaders['X-Mx-ReqToken'] = dc.token;
    url += '&userId=' + encodeURIComponent(dc.userId);
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
      // 【改】所有游戏都读后端 detail（原来只有 maimai 读）：后端已删假数据，
      //   501「该游戏暂未接入真实数据源」、舞立方 502 上游原文都要原样进面板。
      let detail = '';
      try {
        const errBody = await res.json();
        if (errBody && errBody.detail) detail = ' ' + String(errBody.detail);
      } catch (e) { /* 响应不是 JSON 就保持原样 */ }
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





/* ---------- 【新增｜分区 4】水鱼 Token：读取与占位渲染 ----------------------------
   写入口在「分区 3」的卡片模块，这里只负责读取 + 面板占位。
   key 固定为 novarise_df_token（与分区 3 完全一致）。
   ----------------------------------------------------------------------------- */
const DF_TOKEN_STORAGE_KEY = 'novarise_df_token';

function readDfToken() {
  try { return (localStorage.getItem(DF_TOKEN_STORAGE_KEY) || '').trim(); } catch (e) { return ''; }
}

/* ---------- 【新增】舞立方凭证：读取与失效判断 ----------------------------
   写入口在「分区 3」的舞立方卡片模块，这里负责读取 + 错误归类。
   key 固定为 novarise_dc_token / novarise_dc_userid（与分区 3 完全一致）。
   ----------------------------------------------------------------------- */
const DC_TOKEN_STORAGE_KEY = 'novarise_dc_token';
const DC_USERID_STORAGE_KEY = 'novarise_dc_userid';

function readDcToken() {
  try {
    return {
      token: (localStorage.getItem(DC_TOKEN_STORAGE_KEY) || '').trim(),
      userId: (localStorage.getItem(DC_USERID_STORAGE_KEY) || '').trim()
    };
  } catch (e) {
    return { token: '', userId: '' };
  }
}

// 判断异常是否属于「舞立方凭证无效 / 过期」：401/403 或 detail 里带无效、过期字样
function isDcTokenError(err) {
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  return /HTTP\s*(401|403)/i.test(msg)
      || /(token|凭证)[\s\S]{0,16}(无效|过期|有误|invalid|expired)/i.test(msg);
}

// 面板当前显示的游戏；返回生活面板时置空（供分区 3 的绑定/解绑钩子判断）
let gdCurrentGame = null;

// 判断异常是否属于「Token 无效 / 过期」：后端 detail 形如「水鱼 Import-Token 无效或已过期」
function isDfTokenError(err) {
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  return /(import-token|import token|token)[\s\S]{0,16}(无效|过期|有误|invalid|expired)/i.test(msg)
      || /HTTP\s*(401|403)/i.test(msg);
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

// 【新增】舞立方版本，与水鱼钩子一一对应
window.__nvRefreshDancecube = function () {
  // 只有当前正停留在舞立方面板才需要立刻重拉，否则下次点舞立方时自然带上新凭证
  if (gdCurrentGame === 'dancecube') showGameDashboard('dancecube');
};
window.__nvClearDancecube = function () {
  const gd = document.getElementById('gameDashboard');
  const visible = gd && gd.getAttribute('style') && /display:\s*grid/.test(gd.getAttribute('style'));
  if (visible && gdCurrentGame === 'dancecube') {
    renderGdTokenMissing('dancecube', '未绑定舞立方凭证',
      '请在上方「🔗 绑定舞立方凭证」处填入 Access-Token 与 UserID', '凭证未绑定');
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
  // 【新增】舞立方凭证卡片：舞立方显示，其余游戏一律隐藏
  const dcCard = document.getElementById('dcTokenCard');
  if (dcCard) dcCard.style.display = (gameId === 'dancecube') ? '' : 'none';
  // 隐藏生活卡片；面板内部的 4 张卡（mod1~mod4）必须排除，否则会连面板一起隐藏
  document.querySelectorAll('.card').forEach(card => {
    if (gd.contains(card)) return;
    card.style.display = 'none';
  });
  // 关闭右侧悬浮窗
  const rp = document.getElementById('rightPanel');
  if (rp) rp.style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });   // 回到顶部看面板

  // 【新增｜LOL 专属】只对端游/手游显示切换条与活动入口，其余游戏一律隐藏
  syncLolNodes(gameId);

  // 【新增｜LOL / LOLM】纯本地数据渲染（localStorage），不发任何后端请求
  if (gameId === 'lol' || gameId === 'lolm') {
    renderLolDashboard(gameId);
    return;
  }

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

    /* 【新增】未绑定舞立方凭证：请求压根没发出去，面板占位 + Toast 引导绑定 */
    if (err && err.code === 'NO_DC_TOKEN') {
      renderGdTokenMissing(gameId, '未绑定舞立方凭证',
        '请在上方「🔗 绑定舞立方凭证」处填入 Access-Token 与 UserID', '凭证未绑定');
      showToast('请先绑定舞立方凭证');
      return;
    }

    /* 【新增】舞立方凭证无效 / 过期：面板占位 + Toast 引导解绑重绑 */
    if (gameId === 'dancecube' && isDcTokenError(err)) {
      renderGdTokenMissing(gameId, '凭证无效或已过期',
        '请解绑后重新绑定舞立方凭证', '凭证已失效');
      showToast('凭证无效或已过期，请解绑后重新绑定');
      console.warn('[gameDashboard] 舞立方凭证失效：', gameId, err);
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

/* ============================================================
   【新增｜LOL / LOLM】纯本地数据面板
   · 数据落在 localStorage['novarise_lol_profile']，不发任何请求
   · 首次打开写入种子档（用户掌盟战绩页快照），之后以本机存档为准
   · 结构与舞萌/舞立方一致：沿用 mod1~mod4 四张卡，不新增页面层级
   · 未核实字段（如英雄名）一律不写，宁缺不编
   ============================================================ */

const LOL_PROFILE_KEY = 'novarise_lol_profile';
const LOL_ACT_URL = 'https://lol.qq.com/act/a20261115champion/preview.html?e_code=500130';
const LOL_ACT_END = '2026-12-27';   // 官方活动结束日，过期自动隐藏入口条，免人工维护

// 国服公开大区名（用于本地切换显示，不发起任何连接）
const LOL_REGIONS = ['艾欧尼亚', '黑色玫瑰', '德玛西亚', '诺克萨斯', '祖安', '皮尔特沃夫', '巨神峰', '教育网专区', '峡谷之巅'];

// 种子档：来自用户掌盟「战绩 / 能力」页快照（2026-11-20 前后）
// 英雄名无法确认，一律不写；只保留能看清的 KDA、评分、模式、队列、时间
const LOL_SEED_PROFILE = {
  riotId: 'Si00008#74097',
  region: '艾欧尼亚',
  login: 'QQ',
  lolRank: '不屈白银 IV',
  lolmRank: '铂金 II',
  season: 'S16 三赛段',
  totals: { matches: 133, winRate: 45.1, mvpSvp: 7 },
  modes: [
    { name: '经典模式', matches: 0, winRate: 0 },
    { name: '海斗(经典)', matches: 0, winRate: 0 },
    { name: '海克斯大乱斗', matches: 16, winRate: 43.7 },
    { name: '灵活排位', matches: 49, winRate: 32.6 },
    { name: '单双排', matches: 68, winRate: 54.4 },
  ],
  matches: [
    { result: 'win',  kda: '9/17/33', score: '11.0', mode: '海克斯大乱斗', queue: '—',           time: '11-20 21:40' },
    { result: 'win',  kda: '5/7/11',  score: '8.3',  mode: '灵活组排',    queue: '白银 IV 34',   time: '11-20 21:08' },
    { result: 'lose', kda: '1/6/6',   score: '6.8',  mode: '灵活组排',    queue: '白银 IV 13',   time: '11-20 20:30' },
    { result: 'lose', kda: '1/7/0',   score: '9.0',  mode: '灵活组排',    queue: '白银 IV 32',   time: '11-20 20:05' },
    { result: 'win',  kda: '5/6/7',   score: '9.6',  mode: '灵活组排',    queue: '白银 IV 50',   time: '11-17 19:02' },
    { result: 'win',  kda: '2/10/12', score: '7.8',  mode: '单双排',      queue: '黑铁 I 23',    time: '11-17 18:23' },
    { result: 'lose', kda: '5/11/8',  score: '7.8',  mode: '灵活组排',    queue: '白银 IV 28',   time: '11-15 17:17' },
    { result: 'lose', kda: '3/7/2',   score: '6.6',  mode: '灵活组排',    queue: '白银 IV',      time: '11-15 16:40' },
  ],
  favorites: [],   // 职业选手收藏，由职业选手页写回
};

function lolClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function readLolProfile() {
  try {
    const raw = localStorage.getItem(LOL_PROFILE_KEY);
    if (!raw) {
      const seed = lolClone(LOL_SEED_PROFILE);
      localStorage.setItem(LOL_PROFILE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Object.assign(lolClone(LOL_SEED_PROFILE), parsed || {});
  } catch (e) {
    return lolClone(LOL_SEED_PROFILE);
  }
}

function writeLolProfile(patch) {
  try {
    const next = Object.assign({}, readLolProfile(), patch);
    localStorage.setItem(LOL_PROFILE_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    return null;
  }
}

// 活动是否仍在有效期（过了截止日就自动收起入口条）
function lolActAvailable() {
  const end = new Date(LOL_ACT_END + 'T23:59:59');
  if (isNaN(end.getTime())) return true;
  return new Date() <= end;
}

// 端游/手游专属节点的显隐
function syncLolNodes(gameId) {
  const isLol = (gameId === 'lol' || gameId === 'lolm');
  const bar = document.getElementById('lolTopBar');
  if (bar) bar.style.display = isLol ? 'flex' : 'none';

  const menu = document.getElementById('lolSwitchMenu');
  if (menu) {
    menu.style.display = 'none';
    menu.innerHTML = '';
  }

  const act = document.getElementById('lolActLink');
  if (act) {
    if (isLol && lolActAvailable()) {
      act.setAttribute('href', LOL_ACT_URL);
      act.style.display = 'flex';
    } else {
      act.style.display = 'none';
    }
  }
}

// 切换菜单：端游列大区 / 手游列登录方式
function renderLolSwitchMenu() {
  const menu = document.getElementById('lolSwitchMenu');
  if (!menu) return;
  const p = readLolProfile();

  if (gdCurrentGame === 'lolm') {
    menu.innerHTML = '<div class="lol-menu-note">选择登录方式（仅本地记录，不发起授权）</div>' +
      ['QQ', '微信'].map(v => '<button type="button" class="lol-chip' + (p.login === v ? ' is-active' : '') +
        '" data-login="' + escapeHtml(v) + '">' + escapeHtml(v) + '</button>').join('');
    menu.querySelectorAll('[data-login]').forEach(function (b) {
      b.addEventListener('click', function () {
        writeLolProfile({ login: b.getAttribute('data-login') });
        menu.style.display = 'none';
        renderLolDashboard('lolm');
      });
    });
  } else {
    menu.innerHTML = '<div class="lol-menu-note">选择服务器大区（仅本地记录，不发起连接）</div>' +
      LOL_REGIONS.map(v => '<button type="button" class="lol-chip' + (p.region === v ? ' is-active' : '') +
        '" data-region="' + escapeHtml(v) + '">' + escapeHtml(v) + '</button>').join('');
    menu.querySelectorAll('[data-region]').forEach(function (b) {
      b.addEventListener('click', function () {
        writeLolProfile({ region: b.getAttribute('data-region') });
        menu.style.display = 'none';
        renderLolDashboard('lol');
      });
    });
  }
}

// 用本地存档渲染 mod1~mod4，排版与舞萌/舞立方完全相同
function renderLolDashboard(gameId) {
  const p = readLolProfile();
  const isMobile = (gameId === 'lolm');
  const label = isMobile ? '英雄联盟手游' : '英雄联盟';
  const setText = function (id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // 顶部切换器文案与头像
  const switchLabel = document.getElementById('lolSwitchLabel');
  if (switchLabel) switchLabel.textContent = isMobile ? (p.login + ' 登录') : p.region;
  const avatarEl = document.getElementById('lolAvatar');
  if (avatarEl) avatarEl.textContent = isMobile ? '手' : 'L';

  // 模块1：玩家信息
  setText('gdGameName', label + ' · 玩家信息');
  setText('gdPlayerTag', '本机存档');
  setText('gdPlayerName', p.riotId || '未设置召唤师');
  setText('gdPlayerSub', p.region + ' · ' + (isMobile ? p.login + ' 登录' : '电信'));
  setText('gdPlayerLevel', 'LOL ' + p.lolRank);
  setText('gdPlayerRank', 'LOLM ' + p.lolmRank);
  const gdAvatar = document.getElementById('gdAvatar');
  if (gdAvatar) gdAvatar.textContent = '🎯';

  // 模块2：核心数据（四格，与舞萌同版式）
  const statGrid = document.getElementById('gdStatsGrid');
  if (statGrid) {
    const cells = [
      { label: '赛段总场次', value: String(p.totals.matches) },
      { label: '赛段胜率', value: p.totals.winRate + '%' },
      { label: 'MVP / SVP', value: String(p.totals.mvpSvp) },
      { label: '当前赛季', value: p.season },
    ];
    statGrid.innerHTML = cells.map(function (c) {
      return '<div style="padding:10px 12px;border-radius:12px;background:var(--bg,#f1f3f6);">' +
        '<div style="font-size:11px;color:var(--text-secondary,#666);">' + escapeHtml(c.label) + '</div>' +
        '<div class="gd-stat-value" style="font-size:20px;font-weight:700;color:var(--text,#222);margin-top:2px;">' +
        escapeHtml(c.value) + '</div></div>';
    }).join('');
  }
  const statTag = document.querySelector('#mod2-stats .card-title-right');
  if (statTag) statTag.textContent = '本地存档 · 非实时';

  // 模块3：近期战绩（6 行）
  const matchList = document.getElementById('gdMatchesList');
  if (matchList) {
    matchList.innerHTML = p.matches.slice(0, 6).map(function (m) {
      const win = (m.result === 'win');
      const color = win ? 'var(--success,#39b54a)' : 'var(--danger,#e64a45)';
      return '<div class="gd-match-row" style="display:flex;align-items:center;justify-content:space-between;' +
        'padding:8px 10px;border-radius:10px;background:var(--bg,#f1f3f6);font-size:13px;color:var(--text,#222);">' +
        '<span><span style="color:' + color + ';font-weight:600;">' + (win ? '胜利' : '失败') + '</span> · ' +
        escapeHtml(m.kda) + '</span>' +
        '<span style="font-size:12px;color:var(--text-secondary,#666);">' +
        escapeHtml(m.mode) + ' · ' + escapeHtml(m.time) + ' · ' + escapeHtml(m.score) + '</span></div>';
    }).join('');
  }
  const matchTag = document.querySelector('#mod3-matches .card-title-right');
  if (matchTag) matchTag.textContent = '最近 6 场';

  // 模块4：特色亮点（由本地数据派生，不编造额外战绩）
  const highlightList = document.getElementById('gdHighlightsList');
  if (highlightList) {
    const tags = [
      { text: '单双排 ' + p.modes[4].matches + ' 场', color: 'blue' },
      { text: '灵活组排 ' + p.modes[3].matches + ' 场', color: 'green' },
      { text: '大乱斗 ' + p.modes[2].matches + ' 场', color: 'amber' },
    ];
    highlightList.innerHTML = tags.map(function (t) {
      return '<span class="gd-highlight-tag" style="font-size:12px;padding:5px 10px;border-radius:20px;' +
        (GD_TAG_COLORS[t.color] || GD_TAG_COLORS.blue) + '">' + escapeHtml(t.text) + '</span>';
    }).join('');
  }
  let tipEl = document.getElementById('gdTipText');
  if (!tipEl) {
    const cand = Array.prototype.slice.call(document.querySelectorAll('#mod4-highlights div'))
      .filter(function (el) { return !el.children.length && el.textContent.indexOf('接入') > -1; })[0];
    if (cand) { cand.id = 'gdTipText'; tipEl = cand; }
  }
  if (tipEl) {
    tipEl.textContent = isMobile
      ? '手游与端游共用同一份本机存档；切 QQ / 微信只改本地显示，不发起授权。'
      : '数据来自本机存档（localStorage），未接实时接口；切大区只改本地显示，不发起连接。';
  }
}

// 端游/手游专属节点的事件绑定（只绑一次）
function bindLolPanelEvents() {
  const switchBtn = document.getElementById('lolSwitchBtn');
  const menu = document.getElementById('lolSwitchMenu');

  if (switchBtn && menu) {
    switchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = menu.style.display === 'flex';
      if (open) {
        menu.style.display = 'none';
        switchBtn.setAttribute('aria-expanded', 'false');
      } else {
        renderLolSwitchMenu();
        menu.style.display = 'flex';
        switchBtn.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // 点空白收起切换菜单
  document.addEventListener('click', function (e) {
    if (!menu || menu.style.display !== 'flex') return;
    const t = e.target;
    if (t && t.closest && (t.closest('#lolSwitchMenu') || t.closest('#lolSwitchBtn'))) return;
    menu.style.display = 'none';
    if (switchBtn) switchBtn.setAttribute('aria-expanded', 'false');
  });

  const myDataBtn = document.getElementById('lolMyDataBtn');
  if (myDataBtn) myDataBtn.addEventListener('click', function () { window.open('modules/lol/lol.html#my', '_blank'); });

  const proBtn = document.getElementById('lolProBtn');
  if (proBtn) proBtn.addEventListener('click', function () { window.open('modules/lol/lol.html#pro', '_blank'); });

  const actLink = document.getElementById('lolActLink');
  if (actLink) actLink.setAttribute('href', LOL_ACT_URL);

  // 分类标题折叠：MOBA 分组默认展开，点标题可收起/展开（原本没有这段逻辑，标题点不动）
  Array.prototype.forEach.call(document.querySelectorAll('.rp-group-head'), function (head) {
    if (head.dataset.lolBound) return;
    head.dataset.lolBound = '1';
    head.addEventListener('click', function () {
      const body = head.nextElementSibling;
      if (!body || !body.classList.contains('rp-group-body')) return;
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      head.textContent = head.textContent.replace(/^([▾▸])/, open ? '▸' : '▾');
    });
  });
}

bindLolPanelEvents();
