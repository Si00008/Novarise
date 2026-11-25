/* =========================================================
   英雄联盟 · 页面脚本（合并版）
   合并自：lol-honor.js（我的数据） + lol-pro.js（职业选手）
   · 两页签共用一份存档读逻辑、一份 esc，删掉重复副本
   · 只读 localStorage['novarise_lol_profile']，不发任何请求
   · 八维雷达在未接入真实数据前 value 留空
   · 页签用 #my / #pro 记忆，game.js 的入口按钮各带一个 hash
   ========================================================= */

(function () {
  'use strict';

  var PROFILE_KEY = 'novarise_lol_profile';
  var APP_KEY = 'Novarise_data';

  /* ---- 与冉星面板共用的种子档（本页无存档时也能正常显示） ---- */
  var SEED = {
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
      { result: 'win', kda: '9/17/33', score: '11.0', mode: '海克斯大乱斗', queue: '—', time: '11-20 21:40' },
      { result: 'win', kda: '5/7/11', score: '8.3', mode: '灵活组排', queue: '白银 IV 34', time: '11-20 21:08' },
      { result: 'lose', kda: '1/6/6', score: '6.8', mode: '灵活组排', queue: '白银 IV 13', time: '11-20 20:30' },
      { result: 'lose', kda: '1/7/0', score: '9.0', mode: '灵活组排', queue: '白银 IV 32', time: '11-20 20:05' },
      { result: 'win', kda: '5/6/7', score: '9.6', mode: '灵活组排', queue: '白银 IV 50', time: '11-17 19:02' },
      { result: 'win', kda: '2/10/12', score: '7.8', mode: '单双排', queue: '黑铁 I 23', time: '11-17 18:23' },
      { result: 'lose', kda: '5/11/8', score: '7.8', mode: '灵活组排', queue: '白银 IV 28', time: '11-15 17:17' },
      { result: 'lose', kda: '3/7/2', score: '6.6', mode: '灵活组排', queue: '白银 IV', time: '11-15 16:40' },
    ],
    favorites: [],
  };

  /* ---- 八维雷达维度（顺序与上限固定） ---- */
  var DIMENSIONS = [
    { name: 'KDA', max: 10 },
    { name: '参团率', max: 100 },
    { name: '分均伤害', max: 2000 },
    { name: '分均承伤', max: 3000 },
    { name: '分均经济', max: 800 },
    { name: '视野得分', max: 100 },
    { name: '补刀数', max: 300 },
    { name: '推塔参与率', max: 100 },
  ];

  /* ---------------------------------------------------------
     选手基础档案（仅保留已核实字段）
     合同到期：查不到就写空字符串，渲染时显示「待核实」
     --------------------------------------------------------- */
  var PLAYERS = [
    {
      id: 'faker',
      name: 'Faker',
      real: '李相赫',
      team: 'T1',
      role: '中单',
      region: 'LCK',
      contract: '',
      source: 'LoL Esports 官方战队页 / Liquipedia',
    },
    {
      id: 'knight',
      name: 'Knight',
      real: '卓定',
      team: 'BLG',
      role: '中单',
      region: 'LPL',
      contract: '2027-11-16',
      source: 'BLG 官方续约公告 / Leaguepedia',
    },
    {
      id: 'chovy',
      name: 'Chovy',
      real: '郑志勋',
      team: 'Gen.G',
      role: '中单',
      region: 'LCK',
      contract: '2027-11-15',
      source: 'Liquipedia / 拳头合同库（2026-11 更新）',
    },
  ];

  /* ==================== 存档读写 ==================== */

  // 渲染用：没有存档就拿种子档兜底
  function readProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(SEED));
      var p = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(SEED)), p || {});
    } catch (e) {
      return JSON.parse(JSON.stringify(SEED));
    }
  }

  // 写入用：只取本机真实存档，不掺种子数据（避免把 SEED 写进 localStorage）
  function readRawProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return { favorites: [] };
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return { favorites: [] };
      if (!Array.isArray(p.favorites)) p.favorites = [];
      return p;
    } catch (e) {
      return { favorites: [] };
    }
  }

  function writeFavorites(favs) {
    try {
      var p = readRawProfile();
      p.favorites = favs;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) { /* 存储不可用时静默跳过 */ }
  }

  function getFavorites() {
    return readProfile().favorites.slice();
  }

  /* ==================== 主题跟随冉星设置 ==================== */
  function applyTheme() {
    try {
      var raw = localStorage.getItem(APP_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d.themeColor === 'string') {
        document.documentElement.style.setProperty('--primary', d.themeColor);
        var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(d.themeColor);
        if (m) {
          document.documentElement.style.setProperty(
            '--primary-rgb',
            parseInt(m[1], 16) + ', ' + parseInt(m[2], 16) + ', ' + parseInt(m[3], 16)
          );
        }
      }
      if (d && d.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) { /* 主题读不到就保持默认 */ }
  }

  /* ==================== 公共工具（合并前两页各有一份，现只留这一份） ==================== */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function pending() {
    return '<span class="pro-pending">待核实</span>';
  }

  function matchPlayer(p, q) {
    if (!q) return false;
    var pool = [p.name, p.real, p.team, p.role, p.region].filter(Boolean).join(' ').toLowerCase();
    return pool.indexOf(q.toLowerCase()) > -1;
  }

  /* ==================== 我的数据：渲染 ==================== */
  function renderProfile(p) {
    setText('myRegion', p.region || '未设置');
    setText('myName', p.riotId || '未设置召唤师');
    setText('mySub', (p.region || '') + ' · ' + (p.login ? p.login + ' 登录' : '登录方式待设置'));
    setText('myLolRank', p.lolRank || '待核实');
    setText('myLolmRank', p.lolmRank || '待核实');
    var av = document.getElementById('myAvatar');
    if (av) av.textContent = 'L';
  }

  function renderStats(p) {
    var box = document.getElementById('myStats');
    if (!box) return;
    var cells = [
      { label: '赛段总场次', value: String(p.totals.matches) },
      { label: '赛段总胜率', value: p.totals.winRate + '%' },
      { label: 'MVP / SVP', value: String(p.totals.mvpSvp) },
      { label: '当前赛季', value: p.season },
    ];
    box.innerHTML = cells.map(function (c) {
      return '<div class="my-stat"><div class="my-stat-label">' + esc(c.label) + '</div>' +
        '<div class="my-stat-value">' + esc(c.value) + '</div></div>';
    }).join('');
  }

  function renderModes(p) {
    var box = document.getElementById('myModes');
    if (!box) return;
    setText('myModeTotal', p.totals.matches + ' 场');

    var max = Math.max.apply(null, p.modes.map(function (m) { return m.matches; }).concat([1]));
    box.innerHTML = p.modes.map(function (m) {
      var w = Math.round((m.matches / max) * 100);
      return '<div class="my-mode-row">' +
        '<div class="my-mode-top"><span class="my-mode-name">' + esc(m.name) + '</span>' +
        '<span>' + m.matches + ' 场 · ' + m.winRate + '%</span></div>' +
        '<div class="my-mode-bar"><div class="my-mode-fill" style="width:' + w + '%"></div></div>' +
        '</div>';
    }).join('');
  }

  function renderMatches(p) {
    var box = document.getElementById('myMatches');
    if (!box) return;
    setText('myMatchCount', p.matches.length + ' 场');

    box.innerHTML = p.matches.map(function (m) {
      var win = (m.result === 'win');
      return '<div class="my-match ' + (win ? 'is-win' : 'is-lose') + '">' +
        '<div class="my-match-left">' +
        '<span class="my-match-result">' + (win ? '胜利' : '失败') + '</span>' +
        '<span class="my-match-kda">' + esc(m.kda) + '</span>' +
        '</div>' +
        '<div class="my-match-right">' +
        '<span>' + esc(m.mode) + '</span>' +
        (m.queue && m.queue !== '—' ? '<span>' + esc(m.queue) + '</span>' : '') +
        '<span>' + esc(m.time) + '</span>' +
        '<span>评分 ' + esc(m.score) + '</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* ---------------- 八维雷达 ---------------- */
  function renderRadar() {
    var box = document.getElementById('myRadar');
    if (!box) return;

    if (typeof echarts === 'undefined') {
      box.innerHTML = '<div class="my-tip" style="padding:12px 0;">图表库加载失败（ECharts CDN 不可达），框架暂不显示。</div>';
      return;
    }

    var primary = cssVar('--primary', '#5B8FF9');
    var rgb = cssVar('--primary-rgb', '91, 143, 249');
    var textColor = cssVar('--text', '#333');
    var axisColor = cssVar('--border', '#e5e7eb');

    var chart = echarts.init(box);
    chart.setOption({
      radar: {
        indicator: DIMENSIONS,
        radius: '66%',
        center: ['50%', '52%'],
        splitNumber: 4,
        axisName: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: axisColor } },
        splitArea: { areaStyle: { color: ['rgba(' + rgb + ',0.04)', 'transparent'] } },
        axisLine: { lineStyle: { color: axisColor } },
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        lineStyle: { width: 2, color: primary },
        itemStyle: { color: primary },
        areaStyle: { color: 'rgba(' + rgb + ',0.22)' },
        // 【接入位置】拿到真实数据后，把 8 个数值按上面 DIMENSIONS 顺序填进 value
        data: [{ value: [], name: '我的数据' }],
      }],
    });

    window.addEventListener('resize', function () { chart.resize(); });
  }

  /* ==================== 职业选手：卡片与视图 ==================== */
  function cardHtml(p, isFav) {
    var meta = [
      (p.team || pending()) + ' · ' + (p.role || pending()),
      p.region ? p.region : pending(),
      '合同 ' + (p.contract ? esc(p.contract) : pending()),
    ].join(' · ');

    return [
      '<div class="pro-card" data-id="' + esc(p.id) + '">',
      '  <div class="pro-avatar" aria-hidden="true">' + esc(p.name.charAt(0)) + '</div>',
      '  <div class="pro-info">',
      '    <div class="pro-name">' + esc(p.name) + (p.real ? '（' + esc(p.real) + '）' : '') + '</div>',
      '    <div class="pro-meta">' + meta + '</div>',
      '  </div>',
      '  <button type="button" class="pro-fav-btn' + (isFav ? ' is-fav' : '') + '" data-fav="' + esc(p.id) + '">' +
      (isFav ? '已收藏' : '收藏') + '</button>',
      '</div>',
    ].join('');
  }

  var state = { query: '' };

  function renderResults() {
    var box = document.getElementById('proResults');
    var empty = document.getElementById('proEmpty');
    if (!box) return;

    if (!state.query) {
      box.innerHTML = '';
      if (empty) empty.hidden = true;
      return;
    }

    var favs = getFavorites();
    var hits = PLAYERS.filter(function (p) { return matchPlayer(p, state.query); });

    box.innerHTML = hits.map(function (p) { return cardHtml(p, favs.indexOf(p.id) > -1); }).join('');
    if (empty) empty.hidden = hits.length > 0;
  }

  function renderFavorites() {
    var box = document.getElementById('proFavList');
    var empty = document.getElementById('favEmpty');
    var count = document.getElementById('favCount');
    if (!box) return;

    var favs = getFavorites();
    if (count) count.textContent = String(favs.length);

    var items = PLAYERS.filter(function (p) { return favs.indexOf(p.id) > -1; });
    box.innerHTML = items.map(function (p) { return cardHtml(p, true); }).join('');
    if (empty) empty.hidden = items.length > 0;
  }

  function toggleFav(id) {
    var favs = getFavorites();
    var i = favs.indexOf(id);
    if (i > -1) favs.splice(i, 1);
    else favs.push(id);
    writeFavorites(favs);
    renderResults();
    renderFavorites();
  }

  /* ==================== 页签切换 ==================== */
  function tabFromHash() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    return h === 'pro' ? 'pro' : 'my';
  }

  function switchTab(tab, silent) {
    var isPro = (tab === 'pro');
    var paneMy = document.getElementById('pane-my');
    var panePro = document.getElementById('pane-pro');
    var region = document.getElementById('myRegion');
    var tabs = document.querySelectorAll('.lol-tab');

    if (paneMy) paneMy.hidden = isPro;
    if (panePro) panePro.hidden = !isPro;
    if (region) region.hidden = isPro;

    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-tab') === tab;
      tabs[i].classList.toggle('is-on', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }

    if (!silent) {
      try {
        history.replaceState(null, '', location.pathname + location.search + (isPro ? '#pro' : '#my'));
      } catch (e) { /* file:// 下个别浏览器不支持，忽略 */ }
    }

    // 雷达图在隐藏容器里初始化会量到 0 尺寸，切回「我的数据」时让它重新量一次
    if (!isPro) {
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e) { /* 老浏览器忽略 */ }
    }
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('.lol-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'));
      });
    }
    window.addEventListener('hashchange', function () { switchTab(tabFromHash(), true); });
  }

  /* ==================== 事件 ==================== */
  function bind() {
    var input = document.getElementById('proSearchInput');
    var searchBtn = document.getElementById('proSearchBtn');
    var clearBtn = document.getElementById('proClearBtn');

    function doSearch() {
      state.query = (input && input.value || '').trim();
      if (state.query) switchTab('pro');
      renderResults();
    }

    if (input) {
      input.addEventListener('input', doSearch);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
      });
    }
    if (searchBtn) searchBtn.addEventListener('click', doSearch);

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (input) input.value = '';
        state.query = '';
        renderResults();
        if (input) input.focus();
      });
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-fav]') : null;
      if (!btn) return;
      toggleFav(btn.getAttribute('data-fav'));
    });
  }

  /* ==================== 启动 ==================== */
  var profile = readProfile();
  switchTab(tabFromHash(), true);
  bindTabs();
  applyTheme();
  bind();
  renderProfile(profile);
  renderStats(profile);
  renderModes(profile);
  renderMatches(profile);
  renderRadar();
  renderResults();
  renderFavorites();
})();
