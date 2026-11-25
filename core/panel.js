/* ============================================================
   【面板渲染层】panel.js
   职责：加载中 / 失败 / 正常数据 / 未绑定 Token 四种面板状态的渲染
   依赖：shared.js（escapeHtml）、game.js（GD_GAME_LABELS / GD_TAG_COLORS / API_BASE / showGameDashboard）
   加载顺序：shared.js → game.js → panel.js → ai.js → app.js
   2026.11.25 步骤3：五个函数整块从 game.js 搬出，函数体一字未改
   ============================================================ */

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
