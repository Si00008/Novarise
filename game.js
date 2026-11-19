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
  lol: 'LOL',
  hok: '王者荣耀',
  valorant: '瓦罗兰特',
};

// 请求序号：连点不同游戏时只认最后一次点击的结果，避免先发的慢响应覆盖后发的新数据
let gdRequestSeq = 0;

/* ---------- 【本轮改造】真实接口请求 ---------- */

/**
 * 拉取某个游戏的真实数据
 * @param {string} gameId maimai / dancecube / lol / hok / valorant
 * @param {number} timeoutMs 超时毫秒数（魔搭冷启动慢，给足 45 秒）
 * @returns {Promise<object>} 结构：{label, player, stats, matches, highlights, tip}
 */
async function fetchRealGameData(gameId, timeoutMs) {
  let url = API_BASE + '/api/get_game_data?game=' + encodeURIComponent(gameId);
  const limit = timeoutMs || 45000;

  /* ---------- maimai 专用：透传水鱼 Token ----------
     后端 FastAPI 无状态，读取 X-Mx-ReqToken 头（Authorization 会被魔搭网关拦截）。
     其他游戏（dancecube / lol / hok / valorant）走下面的原逻辑。 */
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
     后端 dancecube 分支认 Authorization: Bearer + ?userId= 两项，
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

// 把异常翻译成能直接排查的话（Failed to fetch 十有八九是隧道挂了或后端没开 CORS）
function explainGdError(err) {
  const msg = (err && err.message) ? err.message : String(err);

  if (err && err.name === 'AbortError') {
    return '请求超时（45 秒内没返回）。\n检查隧道是否还活着：浏览器直接打开 ' + API_BASE + '/docs 看看。';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return '请求被中断（Failed to fetch）。按这个顺序查：\n' +
           '① 隧道 ' + API_BASE + ' 当前能不能访问（浏览器打开 ' + API_BASE + '/docs）；\n' +
           '② 后端有没有配 CORS 中间件（没配的话浏览器会直接拦掉响应）；\n' +
           '③ 页面如果是 https 打开，后端也必须是 https（混合内容会被拦）。';
  }
  /* ---------- 【重写】HTTP 4xx / 5xx：从错误消息里拆出状态码与后端 detail ----------
     fetchRealGameData 抛的格式实际是「HTTP {状态码} {statusText} {后端 detail}」，
     中间那段是浏览器/服务端给的标准 reason phrase，不属于详情，得先剥掉；
     剩下可能是纯文本，也可能是 JSON 字符串（再取一次 detail）。
     ----------------------------------------------------------------------------- */
  const httpHit = /^HTTP\s+(\d{3})\s*(.*)$/i.exec(msg);
  if (httpHit) {
    const statusCode = httpHit[1];
    let rest = (httpHit[2] || '').trim();

    // ① 剥掉标准 reason phrase（Bad Gateway / Unauthorized / …）
    const REASON_PHRASES = ['bad request', 'unauthorized', 'payment required', 'forbidden',
      'not found', 'method not allowed', 'not acceptable', 'request timeout', 'conflict',
      'payload too large', 'unsupported media type', 'too many requests', 'gone',
      'internal server error', 'not implemented', 'bad gateway', 'service unavailable',
      'gateway timeout', 'http version not supported'];
    const restLower = rest.toLowerCase();
    for (let i = 0; i < REASON_PHRASES.length; i++) {
      if (restLower.indexOf(REASON_PHRASES[i]) === 0) {
        rest = rest.slice(REASON_PHRASES[i].length).trim();
        break;
      }
    }

    // ② 详情是 JSON 字符串就再取一层 detail / Message
    let detailText = rest;
    if (rest.charAt(0) === '{') {
      try {
        const parsedBody = JSON.parse(rest);
        if (parsedBody && typeof parsedBody.detail === 'string') detailText = parsedBody.detail;
        else if (parsedBody && typeof parsedBody.Message === 'string') detailText = parsedBody.Message;
        else detailText = '';              // 认得是 JSON 但没 detail：交给下面的泛型回退
      } catch (e) { /* 不是合法 JSON，保留原文 */ }
    } else {
      const detailMatch = /"detail"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(rest);
      if (detailMatch) {
        detailText = detailMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }
    detailText = (detailText || '').trim();

    // ③ 凭证类识别：状态码或详情里出现凭证 / 鉴权关键词
    const scanBlob = (statusCode + ' ' + rest + ' ' + detailText).toLowerCase();
    const looksCredential = /凭证|token|过期|无效|未授权|401|403|unauthorized|forbidden/.test(scanBlob);

    if (looksCredential) {
      const nowGame = (typeof gdCurrentGame === 'string') ? gdCurrentGame :
        (typeof window.gdCurrentGame === 'string' ? window.gdCurrentGame : '');
      if (nowGame === 'dancecube') {
        return '❌ 舞立方凭证无效或已过期\n请解绑后重新抓包绑定。';
      }
      if (nowGame === 'maimai') {
        return '❌ 水鱼 Token 无效或已过期\n请解绑后重新获取。';
      }
      // 其他游戏没有凭证概念，落到下面的原文处理
    }

    // ④ 非凭证类：有详情就原样给出；没有就回退到原有泛型提示（语义保持不变）
    if (detailText) {
      return 'HTTP ' + statusCode + '：' + detailText;
    }
    if (statusCode.charAt(0) === '4') {
      return '接口拒绝：' + msg + '\n401/403 查后端鉴权或隧道拦截，404 查 /api/get_game_data 路径拼写。';
    }
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
// data 为接口返回的游戏对象；不做任何本地兜底，数据为空/非法时直接抛给上层 catch
function renderGameDashboard(gameId, data) {
  const gd = document.getElementById('gameDashboard');
  if (!gd) return false;
  const d = data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    throw new Error('接口返回数据为空或格式非法（game=' + gameId + '）');
  }

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

// 未绑定 / Token 失效：把舞萌面板整块替换成占位提示
function renderGdTokenMissing(gameId, reason, bindHint, tagText) {
  const label = GD_GAME_LABELS[gameId] || gameId;
  const hint = reason || '未绑定Token，无法获取成绩';
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('gdGameName', label + ' · 玩家信息');
  setText('gdPlayerTag', tagText || '未绑定 Token');
  setText('gdPlayerName', hint);
  setText('gdPlayerSub', bindHint || '请在上方「🔗 绑定水鱼查分器 Token」处填入你的 Import-Token');
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
